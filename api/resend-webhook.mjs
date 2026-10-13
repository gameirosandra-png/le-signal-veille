import events from '../lib/delivery-events.js';
export async function POST(request){
 if(!process.env.RESEND_WEBHOOK_SECRET)return new Response('Unavailable',{status:503});
 let event;try{const raw=await request.text();if(raw.length>100000)return new Response('Too large',{status:413});event=events.verify(raw,{'svix-id':request.headers.get('svix-id'),'svix-timestamp':request.headers.get('svix-timestamp'),'svix-signature':request.headers.get('svix-signature')});}catch{return new Response('Invalid signature',{status:400});}
 try{await events.processEvent(event);return new Response('OK');}catch{return new Response('Retry later',{status:503});}
}
