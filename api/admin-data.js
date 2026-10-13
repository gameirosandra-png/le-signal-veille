const fs=require('node:fs');const path=require('node:path');
const a=require('../lib/admin-auth');const n=require('../lib/newsletter');
module.exports=async(req,res)=>{
 a.privateHeaders(res);
 if(req.method!=='GET')return res.status(405).json({message:'Méthode non autorisée.'});
 try{
  const s=await a.session(req);
  if(!a.isOwner(s?.user))return res.status(401).json({message:'Connectez-vous pour consulter votre tableau de bord.'});
  if(req.headers.origin&&req.headers.origin!==a.BASE)return res.status(403).json({message:'Origine refusée.'});
  const page=Math.max(1,Math.min(100000,Number.parseInt(req.query?.page,10)||1));
  const search=String(req.query?.search||'').trim().slice(0,120);
  const status=['confirmed','pending','suppressed'].includes(req.query?.status)?req.query.status:'all';
  const where=`($1='' OR strpos(lower(email),lower($1))>0) AND ($2='all' OR ($2='confirmed' AND confirmed_at IS NOT NULL AND suppressed_at IS NULL) OR ($2='pending' AND confirmed_at IS NULL AND suppressed_at IS NULL) OR ($2='suppressed' AND suppressed_at IS NOT NULL))`;
  const db=n.db();
  const [counts,subscribers,total,deliveries,deliveryCounts]=await Promise.all([
   db.query(`SELECT count(*) FILTER(WHERE confirmed_at IS NOT NULL AND suppressed_at IS NULL)::int AS confirmed,count(*) FILTER(WHERE confirmed_at IS NULL AND suppressed_at IS NULL)::int AS pending,count(*) FILTER(WHERE suppressed_at IS NOT NULL)::int AS suppressed FROM newsletter_subscribers`),
   db.query(`SELECT email,requested_at,confirmed_at,suppressed_at FROM newsletter_subscribers WHERE ${where} ORDER BY requested_at DESC,id DESC LIMIT 25 OFFSET $3`,[search,status,(page-1)*25]),
   db.query(`SELECT count(*)::int AS total FROM newsletter_subscribers WHERE ${where}`,[search,status]),
   db.query(`SELECT d.edition,s.email,d.state,d.created_at,d.delivery_event,d.delivery_event_at FROM newsletter_deliveries d JOIN newsletter_subscribers s ON s.id=d.subscriber ORDER BY d.created_at DESC LIMIT 30`),
   db.query(`SELECT edition,state,delivery_event,count(*)::int AS count FROM newsletter_deliveries GROUP BY edition,state,delivery_event`)
  ]);
  const root=path.join(__dirname,'..');const catalog=JSON.parse(fs.readFileSync(path.join(root,'editions/index.json'),'utf8'));const registry=JSON.parse(fs.readFileSync(path.join(root,'data/sujets.json'),'utf8'));
  const editions=catalog.editions.slice(0,12).map(e=>{
   const articles=registry.items.filter(x=>x.edition===e.id);let fingerprints=false;
   if(n.eligible(e,articles)&&e.validatedAt){try{fingerprints=e.validatedContentHash===n.contentHash(e,articles)&&e.validatedHtmlHash===n.hash(fs.readFileSync(path.join(root,e.url),'utf8').replace(/\r\n/g,'\n'));}catch{}}
   return {id:e.id,title:e.title,url:e.url,status:e.status,verified:e.verifiedNews===true,validatedAt:e.validatedAt||null,fingerprints,latest:e.id===catalog.editions[0]?.id,deliveries:deliveryCounts.rows.filter(x=>x.edition===e.id)};
  });
  return res.status(200).json({updatedAt:new Date().toISOString(),counts:counts.rows[0],subscribers:subscribers.rows,total:total.rows[0].total,page,pageSize:25,deliveries:deliveries.rows,editions,automaticSending:process.env.NEWSLETTER_ENABLED==='true'&&process.env.NEWSLETTER_PRIVACY_READY==='true'});
 }catch{return res.status(503).json({message:'Les données sont momentanément indisponibles.'});}
};
