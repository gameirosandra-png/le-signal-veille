const {test,afterEach}=require('node:test');const assert=require('node:assert/strict');
const a=require('../lib/admin-auth');const n=require('../lib/newsletter');
const originals={session:a.session,getAuth:a.getAuth,db:n.db,limit:n.limit};
afterEach(()=>{a.session=originals.session;a.getAuth=originals.getAuth;n.db=originals.db;n.limit=originals.limit;});
function res(){return {headers:{},setHeader(k,v){this.headers[k]=v;},status(s){this.code=s;return this;},json(b){this.body=b;return this;},send(b){this.body=b;return this;}};}
test('private data rejects anonymous, unverified and other accounts before database access',async()=>{
 n.db=()=>{throw Error('Subscriber database must not be accessed');};
 for(const user of [null,{email:a.OWNER,emailVerified:false},{email:'other@example.org',emailVerified:true}]){
  a.session=async()=>user?{user}:null;const r=res();await require('../api/admin-data')({method:'GET',headers:{},query:{}},r);assert.equal(r.code,401);assert.equal(r.headers['Cache-Control'],'private, no-store, max-age=0');assert.ok(!JSON.stringify(r.body).includes('@'));
 }
});
test('magic link request rejects unauthorized addresses, foreign origins and unexposed auth routes',async()=>{
 a.getAuth=()=>{throw Error('Authentication provider must not be invoked');};
 for(const req of [
  {method:'POST',headers:{origin:a.BASE},query:{authPath:'sign-in/magic-link'},body:{email:'other@example.org'}},
  {method:'POST',headers:{origin:'https://evil.example'},query:{authPath:'sign-in/magic-link'},body:{email:a.OWNER}},
  {method:'POST',headers:{origin:a.BASE},query:{authPath:'sign-up/email'},body:{email:a.OWNER}}
 ]){const r=res();await require('../api/admin-auth')(req,r);assert.ok([403,404].includes(r.code));}
});
test('authorized dashboard uses bounded parameterized filters and reports validated edition fingerprints',async()=>{
 a.session=async()=>({user:{email:a.OWNER,emailVerified:true}});const calls=[];
 n.db=()=>({query:async(sql,args)=>{calls.push({sql,args});if(sql.includes('AS confirmed'))return {rows:[{confirmed:1,pending:0,suppressed:0}]};if(sql.includes('AS total'))return {rows:[{total:1}]};return {rows:[]};}});
 const r=res();const search="x' OR 1=1 --";await require('../api/admin-data')({method:'GET',headers:{},query:{search,status:'confirmed',page:'-99'}},r);
 assert.equal(r.code,200);assert.equal(r.body.page,1);assert.equal(r.body.editions[0].fingerprints,true);assert.equal(r.body.editions.find(e=>e.id==='2026-10-12').fingerprints,false);
 const filtered=calls.find(x=>x.sql.includes('LIMIT 25'));assert.deepEqual(filtered.args,[search,'confirmed',0]);assert.ok(!filtered.sql.includes(search));
});
test('authorized magic link request pins destination and forwards secure session cookies',async()=>{
 n.limit=async()=>true;n.db=()=>({query:async()=>({rows:[]})});
 let captured;a.getAuth=async()=>({handler:async req=>{captured=await req.json();return new Response('{}',{status:200,headers:{'Set-Cookie':'fixture=opaque; Secure; HttpOnly; SameSite=Lax'}});}});
 const r=res();await require('../api/admin-auth')({method:'POST',headers:{origin:a.BASE,'content-type':'application/json'},query:{authPath:'sign-in/magic-link'},body:{email:a.OWNER,callbackURL:'https://evil.example'}},r);
 assert.equal(r.code,200);assert.equal(captured.callbackURL,'/admin.html');assert.ok(r.headers['Set-Cookie'][0].includes('HttpOnly'));
});
