const n=require('../lib/newsletter');
const finish=require('../lib/subscription-page');
module.exports=async(req,res)=>{
 if(!['GET','POST'].includes(req.method)) return finish(req,res,405,'Méthode non autorisée.');
 try{
  n.storageConfig();const id=n.tokenId(req.query?.token);if(!id)return n.response(res,400,'Lien invalide.');
  await n.db().query('DELETE FROM newsletter_subscribers WHERE id=$1',[id]);
  return n.response(res,200,'Vous êtes désinscrit. Vos données d’abonnement ont été supprimées.');
 }catch{return n.response(res,503,'Désinscription momentanément indisponible. Réessayez plus tard.');}
};
