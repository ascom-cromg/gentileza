import { canMutate, configured, digest, identity, json, store } from "@/lib/correio/server";
import { validateLetter, type Person } from "@/lib/correio/domain";
import { prepareTransport } from "@/lib/correio/transport";
type Delivery={actor:string;payload_hash:string;status:string};
export async function GET(request:Request) {
  const user=identity(request);
  if(!user?.corporate) return json({error:"Entre com sua conta corporativa."},user?403:401);
  const id=new URL(request.url).searchParams.get("id")||"";
  if(!/^[0-9a-f-]{36}$/i.test(id)) return json({error:"Envio inválido."},400);
  try {
    const result=await store().prepare("SELECT d.status,d.recipient_email AS email,s.name FROM deliveries d LEFT JOIN staff s ON s.email=d.recipient_email WHERE d.id=? AND d.actor=?").bind(id,await digest(user.id)).first<{status:string;email:string;name:string|null}>();
    return json(result?{status:result.status,recipient:{email:result.email,name:result.name||result.email}}:{status:"not_started"});
  }catch{return json({error:"Não foi possível conferir o envio agora."},503);}
}
export async function POST(request:Request) {
  const user=identity(request);
  if(!user?.corporate) return json({error:"Entre com sua conta @cromg.org.br para enviar uma gentileza."},user?403:401);
  if(!canMutate(request)) return json({error:"Pedido inválido."},403);
  let data;
  try { const raw=await request.text();if(raw.length>8000) return json({error:"A mensagem está muito longa."},413);data=validateLetter(JSON.parse(raw)); }
  catch(error) { return json({error:error instanceof SyntaxError?"Confira os campos da mensagem.":error instanceof Error?error.message:"Confira os campos da mensagem."},400); }
  if(!configured()) return json({error:"O envio de e-mails ainda está sendo configurado pela equipe organizadora."},503);
  const db=store(),actor=await digest(user.id),payloadHash=await digest(JSON.stringify({...data,senderEmail:user.email}));
  let claimed=false;
  try {
    const person=await db.prepare("SELECT name,email FROM staff WHERE email=? AND active=1").bind(data.recipientId).first<Person>();
    if(!person) return json({error:"Escolha novamente a pessoa na lista de destinatários."},400);
    const existing=await db.prepare("SELECT actor,payload_hash,status FROM deliveries WHERE id=?").bind(data.id).first<Delivery>();
    if(existing) {
      if(existing.actor!==actor || existing.payload_hash!==payloadHash) return json({error:"Este envio já foi utilizado. Atualize a página para escrever outra mensagem."},409);
      if(existing.status==="sent") return json({sent:true,recipient:person});
      if(existing.status!=="failed") return json({error:"Estamos verificando se esse e-mail foi enviado. Não repita o envio para evitar cópias.",uncertain:true},409);
    }
    const recent=await db.prepare("SELECT COUNT(*) AS count FROM deliveries WHERE actor=? AND created_at>?").bind(actor,Date.now()-3600000).first<{count:number}>();
    if((recent?.count||0)>=30) return json({error:"Muitas gentilezas já saíram por aqui! Aguarde um pouco para enviar outra."},429);
    const deliver=await prepareTransport();
    const claim=existing?await db.prepare("UPDATE deliveries SET status='pending' WHERE id=? AND actor=? AND status='failed' RETURNING id").bind(data.id,actor).first():await db.prepare("INSERT INTO deliveries (id,actor,payload_hash,recipient_email,status,created_at) VALUES (?,?,?,?,'pending',?) ON CONFLICT(id) DO NOTHING RETURNING id").bind(data.id,actor,payloadHash,person.email,Date.now()).first();
    if(!claim) return json({error:"Essa mensagem já está sendo enviada. Aguarde a confirmação.",uncertain:true},409);
    claimed=true;
    const result=await deliver({senderName:data.senderName,senderEmail:data.anonymous?"":user.email,recipientName:person.name,recipientEmail:person.email,message:data.message,color:data.color,category:data.category,anonymous:data.anonymous},data.id,user.email);
    if(!result.ok) {
      const uncertain=result.uncertain;
      await db.prepare("UPDATE deliveries SET status=? WHERE id=?").bind(uncertain?"unknown":"failed",data.id).run();
      return json({error:uncertain?"O serviço não confirmou o envio. A equipe organizadora deve conferir antes de uma nova tentativa.":"O e-mail não foi enviado. Tente novamente em alguns instantes.",uncertain},uncertain?502:503);
    }
    await db.prepare("UPDATE deliveries SET status='sent',provider_id=? WHERE id=?").bind(result.id,data.id).run();
    return json({sent:true,recipient:person},201);
  } catch {
    if(claimed) {try{await db.prepare("UPDATE deliveries SET status='unknown' WHERE id=? AND status='pending'").bind(data.id).run();}catch{}return json({error:"O serviço não confirmou o envio. A equipe organizadora deve conferir antes de uma nova tentativa.",uncertain:true},502);}
    return json({error:"Não foi possível iniciar o envio. Sua mensagem continua aqui para tentar depois."},503);
  }
}
