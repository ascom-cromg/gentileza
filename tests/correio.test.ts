import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync,readdirSync } from 'node:fs';
import { corporateEmail,parseDirectory,validateLetter,type Letter } from '../lib/correio/domain';
import { mimeFor,renderLetter,plainLetter } from '../lib/correio/template';

const sql=new DatabaseSync(':memory:');
for(const name of readdirSync('drizzle').filter(name=>name.endsWith('.sql')).sort())sql.exec(readFileSync('drizzle/'+name,'utf8'));
class Statement {
  args:any[]=[];
  constructor(public query:string){}
  bind(...args:any[]){this.args=args;return this;}
  first(){return sql.prepare(this.query).get(...this.args)??null;}
  all(){return {results:sql.prepare(this.query).all(...this.args)};}
  run(){return {success:true,meta:sql.prepare(this.query).run(...this.args)};}
}
(globalThis as any).__correioTestEnv={DB:{prepare:(q:string)=>new Statement(q),batch:(items:Statement[])=>{sql.exec('BEGIN');try{const r=items.map(item=>item.run());sql.exec('COMMIT');return r;}catch(e){sql.exec('ROLLBACK');throw e;}}},GOOGLE_CLIENT_ID:'test-google-id',GOOGLE_CLIENT_SECRET:'test-google-secret',GOOGLE_TOKEN_KEY:'AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA',GMAIL_CLIENT_ID:'test-id',GMAIL_CLIENT_SECRET:'test-secret',GMAIL_REFRESH_TOKEN:'test-refresh'};
const env=(globalThis as any).__correioTestEnv;
// Dynamic imports ensure the Workers test environment exists first.
const sessionCookies:Record<string,string>={};
before(async()=>{
 const {hash,seal}=await import('../lib/correio/auth-core');
 for(const [email,subject] of [['pessoa.um@cromg.org.br','actor-one'],['outra@cromg.org.br','other']]){
  const token=Buffer.from(crypto.getRandomValues(new Uint8Array(32))).toString('base64url'),id=await hash(token);
  sessionCookies[email+subject]='__Host-gentileza='+token;
  sql.prepare('INSERT INTO staff (email,name,search_text,active,updated_at) VALUES (?,?,?,1,?)').run(email,'Pessoa',email,Date.now());
  sql.prepare('INSERT INTO google_sessions (id,subject,email,name,tokens,expires_at) VALUES (?,?,?,?,?,?)').run(id,subject,email,'Pessoa',await seal({accessToken:'fake-personal',refreshToken:'fake-refresh',expiresAt:Date.now()+3600000},env.GOOGLE_TOKEN_KEY,'tokens:'+id),Date.now()+3600000);
 }
});
const handlers=()=>import('../app/api/correio/send/route');
const request=(data:unknown,email='pessoa.um@cromg.org.br',id='actor-one',origin='https://gentileza-circula-cromg.ascom946966.chatgpt.site')=>new Request('https://gentileza-circula-cromg.ascom946966.chatgpt.site/api/correio/send',{method:'POST',headers:{'content-type':'application/json',origin,cookie:sessionCookies[email+id]||'',...(email?{'oai-authenticated-user-email':email,'oai-authenticated-user-id':id}:{})},body:JSON.stringify(data)});
const data=()=>({id:crypto.randomUUID(),senderName:'Pessoa Um',recipientId:'pessoa.dois@cromg.org.br',message:'Obrigada pelo cuidado e pela parceria!',color:'lavender',category:'agradecimento'});
const letter:Letter={senderName:'Pessoa Um',senderEmail:'pessoa.um@cromg.org.br',recipientName:'Pessoa Dois',recipientEmail:'pessoa.dois@cromg.org.br',message:'Seu cuidado faz a diferença!',color:'butter',category:'reconhecimento'};

test('only the exact corporate domain is allowed',()=>{
  for(const email of ['alguem@gmail.com','a@cromg.org.br.evil.com','a@sub.cromg.org.br','a@cromg.org.br\r\nBcc:evil@example.com','a@@cromg.org.br'])assert.equal(corporateEmail(email),false,email);
  assert.equal(corporateEmail('Nome.Sobrenome@CROMG.ORG.BR'),true);
});
test('CSV disambiguates names by email and rejects external or duplicate addresses',()=>{
  assert.deepEqual(parseDirectory('Nome;E-mail\n"Pessoa, Um";pessoa.um@cromg.org.br'),[{name:'Pessoa, Um',email:'pessoa.um@cromg.org.br',active:true}]);
  assert.throws(()=>parseDirectory('Nome,E-mail\nPessoa Um,alguem@gmail.com'));
  assert.throws(()=>parseDirectory('Nome,E-mail\nPessoa Um,pessoa@cromg.org.br\nPessoa Dois,pessoa@cromg.org.br'));
  assert.throws(()=>validateLetter({...data(),senderName:'Pessoa\r\nBcc: outra'}));
});
test('HTML escapes user content, MIME has one recipient and a verified reply address',()=>{
  const hostile={...letter,message:'<img src=x onerror="alert(1)"> & muito carinho'};
  const html=renderLetter(hostile);assert.ok(html.includes('&lt;img'));assert.ok(!html.includes('<img src=x'));
  const mime=Buffer.from(mimeFor(hostile,crypto.randomUUID()),'base64url').toString('utf8');
  assert.match(mime,/To: <pessoa.dois@cromg.org.br>/);assert.match(mime,/Reply-To: <pessoa.um@cromg.org.br>/);assert.ok(!/^Cc:|^Bcc:/m.test(mime));assert.match(mime,/multipart\/alternative/);
});
test('send denies anonymous callers, wrong domains, cross-origin requests and unknown recipients',async()=>{
  const {POST}=await handlers();
  assert.equal((await POST(request(data(),''))).status,401);
  assert.equal((await POST(request(data(),'a@cromg.org.br.evil.com'))).status,401);
  assert.equal((await POST(request(data(),'pessoa.um@cromg.org.br','actor-one','https://other.example'))).status,403);
  assert.equal((await POST(request(data()))).status,400);
});
test('sending uses the stored recipient, ignores spoofed fields and deduplicates the same submission',async()=>{
  sql.prepare('INSERT INTO staff (email,name,search_text,active,updated_at) VALUES (?,?,?,1,?)').run(letter.recipientEmail,letter.recipientName,'pessoa dois pessoa.dois@cromg.org.br',Date.now());
  const original=globalThis.fetch;let sends=0,captured='';
  globalThis.fetch=(async(input:any,init:any)=>{if(String(input).includes('oauth2.googleapis.com'))return Response.json({access_token:'fake'});sends++;captured=Buffer.from(JSON.parse(init.body).raw,'base64url').toString('utf8');return Response.json({id:'test-receipt'});}) as typeof fetch;
  try{
    const {POST,GET}=await handlers();const body={...data(),recipientEmail:'evil@example.com',senderEmail:'fake@cromg.org.br'};
    assert.equal((await POST(request(body))).status,201);assert.equal((await POST(request(body))).status,200);assert.equal(sends,1);
    assert.match(captured,/From: .*<pessoa.um@cromg.org.br>/);assert.match(captured,/To: <pessoa.dois@cromg.org.br>/);assert.match(captured,/Reply-To: <pessoa.um@cromg.org.br>/);assert.ok(!captured.includes('evil@example.com'));
    assert.equal(sql.prepare('SELECT COUNT(*) AS count FROM messages').get()?.count,0);
    const columns=sql.prepare('PRAGMA table_info(deliveries)').all().map(c=>c.name);assert.ok(!columns.includes('message'));assert.ok(!columns.includes('body'));
    const own=await GET(new Request('https://site.test/api/correio/send?id='+body.id,{headers:{cookie:sessionCookies['pessoa.um@cromg.org.bractor-one'],'oai-authenticated-user-id':'actor-one','oai-authenticated-user-email':'pessoa.um@cromg.org.br'}}));assert.equal((await own.json() as any).status,'sent');
    const other=await GET(new Request('https://site.test/api/correio/send?id='+body.id,{headers:{cookie:sessionCookies['outra@cromg.org.brother'],'oai-authenticated-user-id':'other','oai-authenticated-user-email':'outra@cromg.org.br'}}));assert.equal((await other.json() as any).status,'not_started');
  }finally{globalThis.fetch=original;}
});
test('uncertain delivery never resends automatically',async()=>{
  const original=globalThis.fetch;let sends=0;globalThis.fetch=(async(input:any)=>{if(String(input).includes('oauth2.googleapis.com'))return Response.json({access_token:'fake'});sends++;throw new Error('connection lost after submission');}) as typeof fetch;
  try{const {POST}=await handlers();const body=data();const first=await POST(request(body));assert.equal(first.status,502);assert.equal((await first.json() as any).uncertain,true);assert.equal((await POST(request(body))).status,409);assert.equal(sends,1);}
  finally{globalThis.fetch=original;}
});
test('legacy mural routes never expose or publish messages',async()=>{
  const {GET,POST}=await import('../app/api/messages/route');assert.equal((await GET()).status,410);assert.equal((await POST()).status,410);
});


test('Google directory exports preserve names and suspended status',()=>{
  const people=parseDirectory('First Name,Last Name,Email Address,Status,Last Sign In\nPessoa,Ativa,ativa@cromg.org.br,Active,2026/11/12\nPessoa,Suspensa,suspensa@cromg.org.br,Suspended,2026/01/01');
  assert.deepEqual(people,[{name:'Pessoa Ativa',email:'ativa@cromg.org.br',active:true},{name:'Pessoa Suspensa',email:'suspensa@cromg.org.br',active:false}]);
});
test('anonymous mail omits the author from HTML, plain text and MIME reply headers',()=>{
  const anon={...letter,anonymous:true};
  for(const content of [renderLetter(anon),plainLetter(anon)]){assert.ok(!content.includes(letter.senderName));assert.ok(!content.includes(letter.senderEmail));assert.ok(content.includes('Alguém que te deseja bem'));}
  const mime=Buffer.from(mimeFor(anon,crypto.randomUUID()),'base64url').toString('utf8');assert.ok(!/^Reply-To:/m.test(mime));
  assert.equal(validateLetter({...data(),senderName:'',anonymous:true}).anonymous,true);
  assert.throws(()=>validateLetter({...data(),senderName:'',anonymous:false}));
  assert.throws(()=>validateLetter({...data(),anonymous:'true'}));
});
test('editing the display name does not change the verified corporate account',()=>{
  const chosen=validateLetter({...data(),senderName:'Minha assinatura personalizada'});assert.equal(chosen.senderName,'Minha assinatura personalizada');
});
test('one-time imports are bound to the approved CSV and cannot replay over later edits',async()=>{
  const {POST}=await import('../app/api/correio/directory/route');
  const {digest}=await import('../lib/correio/server');
  const csv='Nome,E-mail,Ativo\nPessoa Importada,importada@cromg.org.br,Sim\nPessoa Inativa,inativa@cromg.org.br,Nao';const nonce='test-import-nonce-that-is-long-enough';
  env.DIRECTORY_IMPORT_HASH=await digest(nonce+'\n'+csv);env.DIRECTORY_IMPORT_EXPIRES_AT=new Date(Date.now()+60000).toISOString();
  try{
    assert.equal((await POST(request({csv,nonce:'wrong-nonce-that-is-long-enough'},''))).status,403);
    const first=await POST(request({csv,nonce},''));assert.equal(first.status,200);assert.equal((await first.json() as any).activeCount,1);
    sql.prepare("UPDATE staff SET name='Nome posterior' WHERE email='importada@cromg.org.br'").run();
    const repeat=await POST(request({csv,nonce},''));assert.equal((await repeat.json() as any).alreadyImported,true);assert.equal(sql.prepare("SELECT name FROM staff WHERE email='importada@cromg.org.br'").get()?.name,'Nome posterior');
    env.DIRECTORY_IMPORT_EXPIRES_AT=new Date(Date.now()-1000).toISOString();assert.equal((await POST(request({csv,nonce},''))).status,403);
  }finally{delete env.DIRECTORY_IMPORT_HASH;delete env.DIRECTORY_IMPORT_EXPIRES_AT;}
});

test('anonymous sends still require a verified corporate identity',async()=>{
  const {POST}=await handlers();const body={...data(),anonymous:true,senderName:''};
  assert.equal((await POST(request(body,''))).status,401);
  assert.equal((await POST(request(body,'outside@gmail.com'))).status,401);
});
