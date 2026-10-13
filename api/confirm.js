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
  if(req.method==='GET') return res.status(200).send(`<!doctype html><html lang="fr"><meta name="viewport" content="width=device-width"><title>Confirmer — LE SIGNAL.</title><body style="background:#f7f3e9;color:#173c34;font:18px Georgia;padding:40px"><h1>LE SIGNAL.</h1><p>Confirmez votre abonnement gratuit à la newsletter.</p><form method="post"><button style="background:#173c34;color:#fffdf8;padding:16px">Confirmer mon abonnement</button></form></body></html>`);
  if(req.method!=='POST') return n.response(res,405,'Méthode non autorisée.');
  const r=await n.db().query(`UPDATE newsletter_subscribers SET confirmed_at=now(),confirm_hash=NULL,confirm_expires=NULL WHERE confirm_hash=$1 AND confirm_expires>now() AND confirmed_at IS NULL AND suppressed_at IS NULL RETURNING id`,[n.hash(t)]);
  return n.response(res,r.rowCount?200:400,r.rowCount?'Votre abonnement est confirmé. Merci !':'Ce lien a expiré ou a déjà été utilisé.');
 }catch{return n.response(res,503,'Confirmation momentanément indisponible.');}
};
