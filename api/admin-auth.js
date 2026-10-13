const a=require('../lib/admin-auth');
const n=require('../lib/newsletter');
module.exports=async(req,res)=>{
 a.privateHeaders(res);
 try{
  const raw=String(req.query?.authPath||'').replace(/^\/+|\/+$/g,'');
  const allowed={'sign-in/magic-link':'POST','magic-link/verify':'GET','get-session':'GET','sign-out':'POST'};
  if(allowed[raw]!==req.method)return res.status(404).json({message:'Accès indisponible.'});
  if(req.method==='POST'&&req.headers.origin!==a.BASE)return res.status(403).json({message:'Origine refusée.'});
  let body=req.body;
  if(typeof body==='string'){try{body=JSON.parse(body);}catch{return res.status(400).json({message:'Demande invalide.'});}}
  if(raw==='sign-in/magic-link'){
   if(typeof body?.email!=='string'||body.email.trim().toLowerCase()!==a.OWNER)return res.status(403).json({message:'Cette adresse ne dispose pas d’un accès.'});
   if(!await n.limit('admin-login-owner'))return res.status(429).json({message:'Trop de demandes. Réessayez dans une heure.'});
   await n.db().query('DELETE FROM signal_admin_session WHERE "expiresAt"<now()');
   await n.db().query('DELETE FROM signal_admin_verification WHERE "expiresAt"<now()');
   await n.db().query('DELETE FROM signal_admin_rate_limit WHERE "lastRequest"<$1',[Date.now()-86400000]);
   body={email:a.OWNER,name:'Sandra GAMEIRO',callbackURL:'/admin.html',newUserCallbackURL:'/admin.html',errorCallbackURL:'/admin.html'};
  }
  const u=new URL(a.BASE+'/api/admin-auth/'+raw);
  for(const [key,value] of Object.entries(req.query||{}))if(key!=='authPath'&&typeof value==='string')u.searchParams.set(key,value);
  const auth=await a.getAuth();
  const response=await auth.handler(new Request(u,{method:req.method,headers:new Headers(req.headers),...(req.method==='POST'?{body:JSON.stringify(body||{})}:{})}));
  for(const [key,value] of response.headers)if(!['set-cookie','cache-control','referrer-policy'].includes(key))res.setHeader(key,value);
  const cookies=response.headers.getSetCookie();if(cookies.length)res.setHeader('Set-Cookie',cookies);
  return res.status(response.status).send(await response.text());
 }catch{return res.status(503).json({message:'Connexion indisponible. Réessayez dans quelques instants.'});}
};
