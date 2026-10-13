const n=require('../lib/newsletter');
const finish=require('../lib/subscription-page');
module.exports=async(req,res)=>{
 res.setHeader('Cache-Control','no-store');res.setHeader('Referrer-Policy','no-referrer');
 const t=req.query?.token;
 if(!/^[a-f0-9]{64}$/.test(t||'')) return finish(req,res,400,'Lien invalide.');
 try{
  try{n.config();}catch{
   n.storageConfig();
   const pending=await n.db().query('SELECT email FROM newsletter_subscribers WHERE confirm_hash=$1 AND confirm_expires>now() AND suppressed_at IS NULL',[n.hash(t)]);
   n.config(pending.rows?.[0]?.email);
  }
  // GET is inert: mail security scanners must not confirm consent.
  if(req.method==='GET') return res.status(200).send(`<!doctype html><html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Confirmer — LE SIGNAL.</title><link rel="stylesheet" href="/site.css"></head><body><header><a class="logo" href="/">LE SIGNAL.</a></header><main><section class="card" style="max-width:760px;margin:40px auto;padding:32px"><p class="tag">Une dernière étape</p><h1 style="font-size:clamp(36px,6vw,58px)">Votre rendez-vous avec LE SIGNAL.</h1><p class="intro">Confirmez votre abonnement gratuit pour recevoir les prochaines éditions validées et publiées.</p><form method="post"><button style="background:#173c34;color:#fffdf8;padding:14px 24px">Confirmer mon abonnement →</button></form><p style="font-size:14px">Désinscription en un clic dans chaque e-mail.</p></section></main><footer><a href="/confidentialite.html">Confidentialité et données personnelles</a></footer></body></html>`);
  if(req.method!=='POST') return finish(req,res,405,'Méthode non autorisée.');
  const r=await n.db().query(`UPDATE newsletter_subscribers SET confirmed_at=now(),confirm_hash=NULL,confirm_expires=NULL WHERE confirm_hash=$1 AND confirm_expires>now() AND confirmed_at IS NULL AND suppressed_at IS NULL RETURNING id`,[n.hash(t)]);
  if(r.rowCount && String(req.headers?.accept||'').includes('text/html')){res.setHeader('Location','/abonnement-confirme.html');return res.status(303).send('');}
  return finish(req,res,r.rowCount?200:400,r.rowCount?'Votre abonnement est confirmé. Merci !':'Ce lien a expiré ou a déjà été utilisé.');
 }catch{return finish(req,res,503,'Confirmation momentanément indisponible.');}
};
