import { test } from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync } from 'node:fs';
import { createHmac,randomUUID } from 'node:crypto';

function runtime(){
  const values=new Map([['GENTILEZA_SHARED_SECRET','test-secret-never-used-outside-tests-12345']]);let sent=[];
  const props={getProperty:k=>values.get(k)||null,setProperty:(k,v)=>values.set(k,v),deleteProperty:k=>values.delete(k),getProperties:()=>Object.fromEntries(values)};
  const context=vm.createContext({Date,JSON,Object,String,Math,PropertiesService:{getScriptProperties:()=>props},Session:{getEffectiveUser:()=>({getEmail:()=> 'ascom@cromg.org.br'})},Utilities:{Charset:{UTF_8:'utf-8'},computeHmacSha256Signature:(body,secret)=>Array.from(createHmac('sha256',secret).update(body).digest()),base64EncodeWebSafe:bytes=>Buffer.from(bytes).toString('base64url'),getUuid:randomUUID},MailApp:{getRemainingDailyQuota:()=>100,sendEmail:options=>sent.push(options)},LockService:{getScriptLock:()=>({tryLock:()=>true,hasLock:()=>true,releaseLock:()=>{}})},ContentService:{MimeType:{JSON:'json'},createTextOutput:text=>({setMimeType:()=>JSON.parse(text)})}});
  vm.runInContext(readFileSync('apps-script/Code.gs','utf8'),context);
  const invoke=(data,bad=false)=>{const payload=JSON.stringify(data),signature=bad?'bad':createHmac('sha256',values.get('GENTILEZA_SHARED_SECRET')).update(payload).digest('base64url');return context.doPost({postData:{contents:JSON.stringify({payload,signature})}});};
  return {invoke,sent};
}
const payload=()=>({version:1,id:randomUUID(),timestamp:Date.now(),actorEmail:'pessoa.um@cromg.org.br',recipientEmail:'pessoa.dois@cromg.org.br',anonymous:false,subject:'Uma gentileza',text:'Uma mensagem de teste.',html:'<p>Uma mensagem de teste.</p>'});
test('Apps Script rejects unsigned, external and expired requests',()=>{const r=runtime();assert.equal(r.invoke(payload(),true).ok,false);assert.equal(r.invoke({...payload(),actorEmail:'outside@gmail.com'}).ok,false);assert.equal(r.invoke({...payload(),recipientEmail:'outside@gmail.com'}).ok,false);assert.equal(r.invoke({...payload(),timestamp:Date.now()-600000}).ok,false);assert.equal(r.sent.length,0);});
test('Apps Script sends once and replies to the verified author only for identified messages',()=>{const r=runtime(),p=payload();assert.equal(r.invoke(p).ok,true);assert.equal(r.invoke(p).ok,true);assert.equal(r.sent.length,1);assert.equal(r.sent[0].replyTo,p.actorEmail);assert.equal(r.sent[0].to,p.recipientEmail);});
test('Apps Script never sets the anonymous author as reply address',()=>{const r=runtime(),p={...payload(),anonymous:true};assert.equal(r.invoke(p).ok,true);assert.equal(r.sent[0].replyTo,'ascom@cromg.org.br');assert.ok(!JSON.stringify(r.sent[0]).includes(p.actorEmail));});
