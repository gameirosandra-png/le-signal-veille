const {test,afterEach}=require('node:test');
const assert=require('node:assert/strict');
const n=require('../lib/newsletter');
const originals={...n};
const env={...process.env};
afterEach(()=>{Object.assign(n,originals);process.env={...env};});
function setup(){Object.assign(process.env,{NEWSLETTER_ENABLED:'true',NEWSLETTER_PRIVACY_READY:'true',DATABASE_URL:'postgres://fixture',RESEND_API_KEY:'fixture',NEWSLETTER_FROM:'fixture@example.org',NEWSLETTER_CONTACT:'fixture@example.org',NEWSLETTER_SECRET:'x'.repeat(32),SITE_URL:'https://le-signal-veille.vercel.app'});}
function res(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(b){this.body=b;return this;},send(b){this.body=b;return this;}};}
test('disabled by default and incomplete privacy configuration refuses activation',()=>{delete process.env.NEWSLETTER_ENABLED;assert.throws(n.config);setup();process.env.NEWSLETTER_PRIVACY_READY='false';assert.throws(n.config);});
test('blocked, pilot and unverified issues never eligible',()=>{const articles=Array.from({length:3},()=>({titre:'Titre',resume:'Résumé'}));const e={id:'2026-10-13',url:'/editions/2026-10-13.html',status:'validee',verifiedNews:true};assert.equal(n.eligible(e,articles),true);for(const status of ['bloquee','edition-pilote','publication-automatique'])assert.equal(n.eligible({...e,status},articles),false);assert.equal(n.eligible({...e,verifiedNews:false},articles),false);assert.equal(n.eligible(e,articles.slice(0,2)),false);assert.equal(n.eligible({...e,url:'https://attacker.example'},articles),false);});
test('unsubscribe signatures reject tampering',()=>{setup();const id='f5556ba9-f77d-407f-a90b-e32f9b22ea68';assert.equal(n.tokenId(n.token(id)),id);assert.equal(n.tokenId(n.token(id).slice(0,-1)+'g'),null);});
test('email escapes editorial HTML and preserves palette and button',()=>{setup();const h=n.emailHtml('<script>',[{titre:'<img>',resume:'A & B'}],'https://example.org','https://example.org/u');assert.ok(!h.includes('<script>'));assert.ok(h.includes('&lt;img&gt;'));assert.ok(h.includes('#173c34'));assert.ok(h.includes('Lire l’édition complète'));});
test('subscription requires explicit consent and correct origin without writing',async()=>{setup();n.db=()=>{throw Error('unexpected DB');};const handler=require('../api/subscribe');let r=res();await handler({method:'POST',headers:{origin:process.env.SITE_URL},body:{email:'a@example.org',consent:false}},r);assert.equal(r.code,400);r=res();await handler({method:'POST',headers:{origin:'https://evil.example'},body:{email:'a@example.org',consent:true}},r);assert.equal(r.code,403);});
test('pending subscription hashes token, sends confirmation, never confirms immediately',async()=>{setup();n.limit=async()=>true;let query,payload;n.db=()=>({query:async(sql,args)=>{query={sql,args};return {rowCount:1,rows:[{id:args[0]}]};}});n.send=async(p)=>{payload=p;return 'provider-fixture';};const r=res();await require('../api/subscribe')({method:'POST',headers:{origin:process.env.SITE_URL},body:{email:'a@example.org',consent:true}},r);assert.equal(r.code,200);assert.ok(!query.sql.includes('SET confirmed_at'));assert.ok(payload.text.includes('/api/confirm?token='));const raw=payload.text.match(/token=([a-f0-9]{64})/)[1];assert.equal(query.args[3],n.hash(raw));assert.notEqual(query.args[3],raw);});
test('confirmation GET is inert; POST consumes valid token',async()=>{setup();let called=0;n.db=()=>({query:async()=>{called++;return {rowCount:1};}});const h=require('../api/confirm');let r=res();await h({method:'GET',query:{token:'a'.repeat(64)}},r);assert.equal(called,0);assert.ok(r.body.includes('method="post"'));r=res();await h({method:'POST',query:{token:'a'.repeat(64)}},r);assert.equal(called,1);assert.equal(r.code,200);});
test('one-click POST deletes subscriber and delivery cascade, repeated request succeeds',async()=>{setup();let sql;n.db=()=>({query:async(q)=>{sql=q;return {rowCount:0};}});const r=res();await require('../api/unsubscribe')({method:'POST',query:{token:n.token('f5556ba9-f77d-407f-a90b-e32f9b22ea68')}},r);assert.equal(r.code,200);assert.ok(sql.startsWith('DELETE'));});
test('dispatch refuses unauthorized invocation and pilot edition without provider calls',async()=>{setup();const fs=require('node:fs'),read=fs.readFileSync;fs.readFileSync=(file,...args)=>String(file).endsWith('editions/index.json')?JSON.stringify({editions:[{id:'2026-10-12',status:'edition-pilote',verifiedNews:false}]}):read(file,...args);try{n.send=async()=>{throw Error('unexpected send');};n.db=()=>({query:async()=>({rows:[]})});const h=require('../api/dispatch');let r=res();await h({method:'POST',headers:{}},r);assert.equal(r.code,401);r=res();await h({method:'POST',headers:{authorization:'Bearer '+process.env.NEWSLETTER_SECRET}},r);assert.equal(r.code,200);assert.ok(r.body.message.includes('Aucune édition'));}finally{fs.readFileSync=read;}});
test('published validated issue sends once; retry is suppressed; missing publication sends nothing',async()=>{
 setup();const fs=require('node:fs'),read=fs.readFileSync,fetchOriginal=global.fetch;
 const edition={id:'2026-10-13',url:'/editions/2026-10-13.html',title:'Édition test',status:'validee',verifiedNews:true,validatedAt:'2026-10-13T09:00:00Z'};
 const items=Array.from({length:3},()=>({edition:edition.id,titre:'Titre',resume:'Résumé'}));
 edition.validatedHtmlHash=n.hash('published-html');edition.validatedContentHash=n.contentHash(edition,items);
 const id='f5556ba9-f77d-407f-a90b-e32f9b22ea68';let sent=0,claimed=false,live=true,state;
 const client={release(){},async query(sql){if(sql.startsWith('SELECT'))return {rowCount:1,rows:[{email:'test@example.org'}]};if(sql.startsWith('INSERT')){if(claimed)return {rowCount:0};claimed=true;return {rowCount:1};}if(sql.includes("state='accepted'"))state='accepted';return {rowCount:0,rows:[]};}};
 n.db=()=>({connect:async()=>client,query:async(sql)=>({rows:sql.startsWith('SELECT')&&!claimed?[{id}]:[]})});n.send=async()=>{sent++;return 'realistic-mocked-id';};
 try{
  const handler=require('../api/dispatch');
  fs.readFileSync=(file,...args)=>String(file).replaceAll('\\','/').endsWith('editions/index.json')?JSON.stringify({editions:[edition]}):String(file).replaceAll('\\','/').endsWith('data/sujets.json')?JSON.stringify({items}):String(file).endsWith('2026-10-13.html')?'published-html':read(file,...args);
  global.fetch=async url=>({ok:live,json:async()=>({editions:[edition]}),text:async()=>'published-html'});
  const req={method:'POST',headers:{authorization:'Bearer '+process.env.NEWSLETTER_SECRET}};
  live=false;let r=res();await handler(req,r);assert.equal(r.code,503);assert.equal(sent,0);
  live=true;r=res();await handler(req,r);assert.equal(r.code,200);assert.equal(sent,1);assert.equal(state,'accepted');
  r=res();await handler(req,r);assert.equal(sent,1);
  items[0].resume='Modifié après validation';r=res();await handler(req,r);assert.equal(r.code,409);assert.equal(sent,1);
 }finally{fs.readFileSync=read;global.fetch=fetchOriginal;}
});
test('unsubscribe remains available when sending is paused and provider credentials removed',async()=>{
 setup();process.env.NEWSLETTER_ENABLED='false';delete process.env.RESEND_API_KEY;
 let deleted=false;n.db=()=>({query:async()=>{deleted=true;return {rowCount:1};}});
 const r=res();await require('../api/unsubscribe')({method:'POST',query:{token:n.token('f5556ba9-f77d-407f-a90b-e32f9b22ea68')}},r);
 assert.equal(r.code,200);assert.equal(deleted,true);
});