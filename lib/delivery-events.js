const n=require('./newsletter');
async function verify(raw,headers){const {Webhook}=await import('svix');new Webhook(process.env.RESEND_WEBHOOK_SECRET).verify(raw,headers);return JSON.parse(raw);}
async function processEvent(event){
 const data=event?.data, type=event?.type;
 const allowed=['email.delivered','email.bounced','email.complained','email.failed','email.suppressed'];
 if(!allowed.includes(type)||!data?.email_id||data.from!==process.env.NEWSLETTER_FROM)return;
 const at=new Date(event.created_at);if(!Number.isFinite(at.getTime()))throw Error('invalid event');
 const client=await n.db().connect();
 try{await client.query('BEGIN');
  // Only identifiers and delivery status are retained, never the webhook body.
  await client.query(`UPDATE newsletter_deliveries SET delivery_event=$2,delivery_event_at=$3 WHERE provider_id=$1 AND (delivery_event_at IS NULL OR delivery_event_at<=$3)`,[data.email_id,type,at]);
  const suppress=type==='email.complained'||type==='email.suppressed'||(type==='email.bounced'&&data.bounce?.type==='Permanent');
  if(suppress&&Array.isArray(data.to))for(const email of data.to){if(typeof email==='string')await client.query('UPDATE newsletter_subscribers SET suppressed_at=COALESCE(suppressed_at,$2) WHERE email=$1',[email.trim().toLowerCase(),at]);}
  await client.query('COMMIT');
 }catch(e){await client.query('ROLLBACK');throw e;}finally{client.release();}
}
module.exports={verify,processEvent};
