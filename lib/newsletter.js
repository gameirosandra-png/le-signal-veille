const crypto = require('node:crypto');
const CONSENT = '2026-10-13-v1';
const hash = value => crypto.createHash('sha256').update(value).digest('hex');
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
function storageConfig() {
  const e = process.env;
  for (const k of ['DATABASE_URL','NEWSLETTER_SECRET']) if (!e[k]) throw Error('configuration');
  if (e.NEWSLETTER_SECRET.length < 32) throw Error('configuration');
  return e;
}
function config(testRecipient) {
  const e = process.env;
  storageConfig();
  const testOnly=typeof testRecipient==='string' && e.NEWSLETTER_TEST_EMAIL && testRecipient===e.NEWSLETTER_TEST_EMAIL;
  if (!testOnly && (e.NEWSLETTER_ENABLED !== 'true' || e.NEWSLETTER_PRIVACY_READY !== 'true')) throw Error('disabled');
  for (const k of ['DATABASE_URL','RESEND_API_KEY','RESEND_WEBHOOK_SECRET','NEWSLETTER_FROM','NEWSLETTER_SECRET','NEWSLETTER_CONTACT','SITE_URL']) if (!e[k]) throw Error('configuration');
  if (e.NEWSLETTER_SECRET.length < 32 || new URL(e.SITE_URL).protocol !== 'https:') throw Error('configuration');
  return e;
}
let pool;
function db() {
  storageConfig();
  if (!pool) {
    const url = new URL(process.env.DATABASE_URL);
    if (url.searchParams.get('sslmode') !== 'verify-full') throw Error('Database requires verified TLS');
    const {Pool} = require('pg'); pool = new Pool({connectionString: process.env.DATABASE_URL, max:3});
  }
  return pool;
}
function token(id) {
  return id + '.' + crypto.createHmac('sha256', process.env.NEWSLETTER_SECRET).update('unsubscribe:'+id).digest('hex');
}
function tokenId(value) {
  if (typeof value !== 'string' || !/^[a-f0-9-]{36}\.[a-f0-9]{64}$/.test(value)) return null;
  const id = value.split('.')[0];
  return crypto.timingSafeEqual(Buffer.from(token(id)),Buffer.from(value)) ? id : null;
}
function eligible(edition, articles) {
  return edition?.verifiedNews === true && edition?.status === 'validee' &&
    /^\d{4}-\d{2}-\d{2}$/.test(edition.id) && edition.url === `/editions/${edition.id}.html` &&
    Array.isArray(articles) && articles.length >= 3 && articles.length <= 8 &&
    articles.every(a => typeof a.titre === 'string' && a.titre.trim() && typeof a.resume === 'string' && a.resume.trim());
}
function contentHash(edition, articles) {
  return hash(JSON.stringify([edition.title, articles.map(a => [a.id,a.titre,a.resume,a.source])]));
}
function emailHtml(title, articles, url, unsubscribe) {
  return `<!doctype html><html lang="fr"><body style="margin:0;background:#f7f3e9;color:#173c34;font:16px/1.6 Arial,sans-serif"><div style="max-width:620px;margin:auto;padding:32px"><p style="color:#b56d52;letter-spacing:3px">LA VEILLE IA · NO-CODE · PRODUIT</p><h1 style="font:48px Georgia,serif">LE SIGNAL.</h1><h2 style="font:28px Georgia,serif">${esc(title)}</h2>${articles.map(a=>`<div style="border-top:1px solid #d9d4c7;padding:20px 0"><h3 style="font:24px Georgia,serif">${esc(a.titre)}</h3><p>${esc(a.resume)}</p></div>`).join('')}<p><a href="${esc(url)}" style="display:inline-block;background:#173c34;color:#fffdf8;padding:14px 22px;text-decoration:none;border-radius:6px">Lire l’édition complète →</a></p><p style="font-size:12px">Abonnement gratuit, confirmé par vous. <a style="color:#b56d52" href="${esc(unsubscribe)}">Se désinscrire</a> · <a href="${esc(process.env.SITE_URL)}/confidentialite.html">Confidentialité</a></p></div></body></html>`;
}
async function send(payload, key) {
  const c=config(payload.to?.length===1?payload.to[0]:undefined);
  const r=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:`Bearer ${c.RESEND_API_KEY}`,'Content-Type':'application/json','Idempotency-Key':key},body:JSON.stringify({from:c.NEWSLETTER_FROM,reply_to:c.NEWSLETTER_CONTACT,...payload})});
  if (!r.ok) throw Error('provider');
  const result=await r.json(); if (!result.id) throw Error('provider'); return result.id;
}
async function limit(key) {
  const opaque = crypto.createHmac('sha256',process.env.NEWSLETTER_SECRET).update('limit:'+key).digest('hex');
  const result=await db().query(`INSERT INTO newsletter_limits(key,hits,expires) VALUES($1,1,now()+interval '1 hour') ON CONFLICT(key) DO UPDATE SET hits=CASE WHEN newsletter_limits.expires<now() THEN 1 ELSE newsletter_limits.hits+1 END, expires=CASE WHEN newsletter_limits.expires<now() THEN now()+interval '1 hour' ELSE newsletter_limits.expires END RETURNING hits`,[opaque]);
  return result.rows[0].hits <= 5;
}
function response(res,status,message) {res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');return res.status(status).json({message});}
module.exports={CONSENT,hash,esc,storageConfig,config,db,token,tokenId,eligible,contentHash,emailHtml,send,limit,response};
