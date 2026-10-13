const {test,afterEach}=require('node:test');const assert=require('node:assert/strict');const n=require('../lib/newsletter');
const original={db:n.db,storageConfig:n.storageConfig,tokenId:n.tokenId};
afterEach(()=>Object.assign(n,original));
function res(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(code){this.code=code;return this;},json(body){this.body=body;return this;},send(body){this.body=body;return this;}};}
test('browser unsubscribe returns a branded HTML page; one-click mail clients still receive JSON',async()=>{
 n.storageConfig=()=>({});n.tokenId=()=> 'fixture';let deleted=0;n.db=()=>({query:async(sql,args)=>{assert.equal(sql,'DELETE FROM newsletter_subscribers WHERE id=$1');assert.deepEqual(args,['fixture']);deleted++;return {rows:[]};}});
 const handler=require('../api/unsubscribe');const browser=res();await handler({method:'GET',headers:{accept:'text/html'},query:{token:'fixture'}},browser);
 assert.equal(browser.code,200);assert.match(browser.body,/<!doctype html>/);assert.match(browser.body,/logo-signal.svg/);assert.match(browser.body,/désinscrit/);assert.equal(browser.headers['Cache-Control'],'no-store');
 const client=res();await handler({method:'POST',headers:{accept:'application/json'},query:{token:'fixture'}},client);assert.equal(client.code,200);assert.equal(typeof client.body.message,'string');assert.equal(deleted,2);
});
test('email template is table-based, escapes untrusted editorial content and keeps confirmation distinct',()=>{
 process.env.SITE_URL='https://le-signal-veille.vercel.app';
 const edition=n.emailHtml('Titre',[{titre:'<img src=x onerror=alert(1)>',resume:'A & B'}],'https://le-signal-veille.vercel.app/editions/2026-10-13.html','https://example.org/u');
 assert.match(edition,/role="presentation"/);assert.ok(!edition.includes('<div'));assert.ok(!edition.includes('<style'));assert.ok(!edition.includes('<img src=x'));assert.match(edition,/&lt;img/);assert.match(edition,/logo-signal.png/);assert.match(edition,/Lire l’édition complète/);
 const confirm=n.emailHtml('Une dernière étape',[],'https://example.org/confirm','https://example.org/u');assert.match(confirm,/Confirmer mon abonnement/);assert.match(confirm,/24 heures/);assert.match(confirm,/Annuler cette demande/);assert.ok(!confirm.includes('Lire l’édition complète'));
});
