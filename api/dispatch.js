const fs=require('node:fs');
const path=require('node:path');
const crypto=require('node:crypto');
const n=require('../lib/newsletter');
module.exports=async(req,res)=>{
 if(req.method!=='POST') return n.response(res,405,'Méthode non autorisée.');
 try{
  const c=n.config(), supplied=String(req.headers.authorization||''),expected='Bearer '+c.NEWSLETTER_SECRET;
  if(supplied.length!==expected.length||!crypto.timingSafeEqual(Buffer.from(supplied),Buffer.from(expected)))return n.response(res,401,'Non autorisé.');
  const root=path.join(__dirname,'..');
  // Cleanup must also run when no edition is eligible.
  await n.db().query("DELETE FROM newsletter_subscribers WHERE confirmed_at IS NULL AND requested_at<now()-interval '48 hours'");
  await n.db().query("DELETE FROM newsletter_limits WHERE expires<now()-interval '24 hours'");
  const catalog=JSON.parse(fs.readFileSync(path.join(root,'editions/index.json'),'utf8'));
  const registry=JSON.parse(fs.readFileSync(path.join(root,'data/sujets.json'),'utf8'));
  // Only the latest issue: never replay historical editions to new subscribers.
  const edition=catalog.editions[0];
  const articles=registry.items.filter(a=>a.edition===edition?.id);
  if(!n.eligible(edition,articles)||!Number.isFinite(Date.parse(edition.validatedAt)))return n.response(res,200,'Aucune édition validée à envoyer.');
  const local=fs.readFileSync(path.join(root,edition.url),'utf8');
  if (edition.validatedHtmlHash !== n.hash(local) || edition.validatedContentHash !== n.contentHash(edition, articles)) return n.response(res,409,'Le contenu a changé depuis sa validation. Une nouvelle revue est nécessaire.');
  const remoteCatalog=await fetch(c.SITE_URL+'/editions/index.json',{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!remoteCatalog.ok)throw Error('not live');
  const live=(await remoteCatalog.json()).editions[0];
  if(JSON.stringify(live)!==JSON.stringify(edition))throw Error('not live');
  const remote=await fetch(c.SITE_URL+edition.url,{cache:'no-store',signal:AbortSignal.timeout(10000)});
  if(!remote.ok||n.hash(await remote.text())!==n.hash(local))throw Error('not live');
  const candidates=await n.db().query(`SELECT id FROM newsletter_subscribers s WHERE confirmed_at IS NOT NULL AND confirmed_at<=$1 AND NOT EXISTS(SELECT 1 FROM newsletter_deliveries d WHERE d.edition=$2 AND d.subscriber=s.id) LIMIT 8`,[edition.validatedAt,edition.id]);
  let accepted=0, uncertain=0;
  for(const candidate of candidates.rows){
   const client=await n.db().connect();
   try{
    await client.query('BEGIN');
    // Lock subscriber against concurrent deletion until the request finishes.
    const s=await client.query('SELECT * FROM newsletter_subscribers WHERE id=$1 AND confirmed_at IS NOT NULL FOR UPDATE',[candidate.id]);
    if(!s.rowCount){await client.query('ROLLBACK');continue;}
    const claim=await client.query("INSERT INTO newsletter_deliveries(edition,subscriber,state) VALUES($1,$2,'sending') ON CONFLICT DO NOTHING RETURNING subscriber",[edition.id,candidate.id]);
    if(!claim.rowCount){await client.query('ROLLBACK');continue;}
    // Persist a claim before provider call: a crash cannot cause an automatic duplicate.
    await client.query('COMMIT');
    await client.query('BEGIN');
    const still=await client.query('SELECT email FROM newsletter_subscribers WHERE id=$1 FOR UPDATE',[candidate.id]);
    if(!still.rowCount){await client.query('ROLLBACK');continue;}
    const unsub=c.SITE_URL+'/api/unsubscribe?token='+n.token(candidate.id);
    try{
     await new Promise(resolve=>setTimeout(resolve,600));
     const provider=await n.send({to:[still.rows[0].email],subject:edition.title,html:n.emailHtml(edition.title,articles,c.SITE_URL+edition.url,unsub),text:`LE SIGNAL.\n${edition.title}\n\n${articles.map(a=>a.titre+'\n'+a.resume).join('\n\n')}\n\nLire : ${c.SITE_URL+edition.url}\nSe désinscrire : ${unsub}`,headers:{'List-Unsubscribe':`<${unsub}>`,'List-Unsubscribe-Post':'List-Unsubscribe=One-Click'}},'edition/'+edition.id+'/'+candidate.id);
     await client.query("UPDATE newsletter_deliveries SET state='accepted',provider_id=$3 WHERE edition=$1 AND subscriber=$2",[edition.id,candidate.id,provider]);accepted++;
    }catch{
     uncertain++;
     await client.query("UPDATE newsletter_deliveries SET state='uncertain' WHERE edition=$1 AND subscriber=$2",[edition.id,candidate.id]);
    }
    await client.query('COMMIT');
   }catch{await client.query('ROLLBACK');throw Error('dispatch');}finally{client.release();}
  }
  return n.response(res,uncertain?503:200,`${accepted} demande(s) acceptée(s) par Resend. ${uncertain} envoi(s) à examiner dans les journaux. La livraison reste à vérifier dans Resend.`);
 }catch{return n.response(res,503,'Envoi indisponible ou publication non confirmée.');}
};
