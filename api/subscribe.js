const crypto=require('node:crypto');
const n=require('../lib/newsletter');
module.exports=async(req,res)=>{
 if(req.method!=='POST') return n.response(res,405,'Méthode non autorisée.');
 try {
  const b=typeof req.body==='string'?JSON.parse(req.body):req.body;
  const email=typeof b?.email==='string'?b.email.trim().toLowerCase():'';
  const c=n.config(email);
  if(req.headers.origin!==c.SITE_URL) return n.response(res,403,'Origine non autorisée.');
  if(b?.consent!==true || email.length>254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return n.response(res,400,'Saisissez un e-mail valide et acceptez l’abonnement.');
  const generic='Si votre demande est recevable, un e-mail de confirmation arrive bientôt. Vérifiez aussi les indésirables.';
  if(b.website) return n.response(res,200,generic);
  const ip=req.headers['x-vercel-forwarded-for']||req.socket?.remoteAddress||'unknown';
  if(!await n.limit('ip:'+ip)||!await n.limit('email:'+email)) return n.response(res,429,'Trop de demandes. Réessayez dans une heure.');
  const raw=crypto.randomBytes(32).toString('hex'), id=crypto.randomUUID();
  const suppression=await n.db().query('SELECT suppressed_at FROM newsletter_subscribers WHERE email=$1',[email]);
  if(suppression.rows[0]?.suppressed_at)return n.response(res,200,generic);
  const r=await n.db().query(`INSERT INTO newsletter_subscribers(id,email,consent_version,confirm_hash,confirm_expires) VALUES($1,$2,$3,$4,now()+interval '24 hours') ON CONFLICT(email) DO UPDATE SET confirm_hash=EXCLUDED.confirm_hash,confirm_expires=EXCLUDED.confirm_expires,requested_at=now(),consent_version=EXCLUDED.consent_version WHERE newsletter_subscribers.confirmed_at IS NULL AND newsletter_subscribers.requested_at < now()-interval '1 hour' RETURNING id`,[id,email,n.CONSENT,n.hash(raw)]);
  if(r.rowCount) {
   const url=c.SITE_URL+'/api/confirm?token='+raw;
   await n.send({to:[email],subject:'Confirmez votre abonnement à LE SIGNAL.',html:n.emailHtml('Une dernière étape',[],url,c.SITE_URL+'/api/unsubscribe?token='+n.token(r.rows[0].id)).replace('Lire l’édition complète →','Confirmer mon abonnement →'),text:`Confirmez votre abonnement gratuit (lien valable 24 h) : ${url}\nSi vous n’avez rien demandé, ignorez ce message.`},'confirm/'+n.hash(raw));
  }
  return n.response(res,200,generic);
 }catch {return n.response(res,503,'L’abonnement est momentanément indisponible. Réessayez plus tard.');}
};
