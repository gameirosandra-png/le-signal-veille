const crypto=require('node:crypto');
const n=require('./newsletter');
const OWNER='ladoucenaissance@gmail.com';
const BASE='https://le-signal-veille.vercel.app';
let instance;
function isOwner(user){return user?.email?.toLowerCase()===OWNER&&user.emailVerified===true;}
function privateHeaders(res){
 res.setHeader('Cache-Control','private, no-store, max-age=0');
 res.setHeader('Referrer-Policy','no-referrer');
 res.setHeader('X-Robots-Tag','noindex, nofollow');
 res.setHeader('X-Content-Type-Options','nosniff');
}
async function sendLink({email,url}){
 if(email.toLowerCase()!==OWNER)throw Error('Access denied');
 const link=new URL(url);if(link.origin!==BASE)throw Error('Invalid origin');
 const c=process.env;
 if(!c.RESEND_API_KEY||!c.NEWSLETTER_FROM)throw Error('Mail unavailable');
 const text=`Votre accès privé à LE SIGNAL : ${url}\n\nCe lien personnel est valable 10 minutes et utilisable une seule fois. Si vous ne l’avez pas demandé, ignorez ce message.`;
 const response=await fetch('https://api.resend.com/emails',{method:'POST',signal:AbortSignal.timeout(20000),headers:{Authorization:'Bearer '+c.RESEND_API_KEY,'Content-Type':'application/json','Idempotency-Key':'admin/'+crypto.createHash('sha256').update(url).digest('hex')},body:JSON.stringify({from:c.NEWSLETTER_FROM,to:[OWNER],reply_to:OWNER,subject:'LE SIGNAL — Votre accès privé',text})});
 if(!response.ok)throw Error('Mail unavailable');
}
async function getAuth(){
 if(!instance)instance=(async()=>{
  n.storageConfig();
  const {betterAuth}=await import('better-auth');const {magicLink}=await import('better-auth/plugins');
  const auth=betterAuth({
   appName:'LE SIGNAL',baseURL:BASE,basePath:'/api/admin-auth',
   secret:crypto.createHmac('sha256',process.env.NEWSLETTER_SECRET).update('le-signal/admin-auth/v1').digest('hex'),
   database:n.db(),trustedOrigins:[BASE],
   user:{modelName:'signal_admin_user'},account:{modelName:'signal_admin_account'},
   verification:{modelName:'signal_admin_verification'},
   session:{modelName:'signal_admin_session',expiresIn:3600,updateAge:0,cookieCache:{enabled:false}},
   rateLimit:{enabled:true,storage:'database',modelName:'signal_admin_rate_limit',window:60,max:10},
   advanced:{useSecureCookies:true,cookiePrefix:'signal_admin',ipAddress:{ipAddressHeaders:['x-vercel-forwarded-for']}},
   emailAndPassword:{enabled:false},
   databaseHooks:{user:{create:{before:async user=>user.email.toLowerCase()===OWNER?{data:user}:false}}},
   plugins:[magicLink({expiresIn:600,storeToken:'hashed',rateLimit:{window:60,max:3},sendMagicLink:sendLink})]
  });
  await auth.$context;
  return auth;
 })().catch(error=>{instance=undefined;throw error;});
 return instance;
}
async function session(req){if(!req.headers.cookie)return null;const auth=await getAuth();return auth.api.getSession({headers:new Headers(req.headers),query:{disableCookieCache:true}});}
module.exports={OWNER,BASE,isOwner,privateHeaders,getAuth,session};
