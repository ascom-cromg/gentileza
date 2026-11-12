import { env } from "cloudflare:workers";
import { googleAccessToken, type GoogleUser } from "./google";
import { accessToken,scriptConfigured } from "./server";
import { MAILBOX,type Letter } from "./domain";
import { mimeFor,plainLetter,renderLetter,subjectFor } from "./template";
type Receipt={ok:true;id:string}|{ok:false;uncertain:boolean};
function base64url(bytes:Uint8Array) { let value="";for(const byte of bytes)value+=String.fromCharCode(byte);return btoa(value).replace(/\+/g,"-").replace(/\//g,"_").replace(/=+$/,""); }
export async function prepareTransport(user:GoogleUser,anonymous:boolean) {
  if(!anonymous) {
    const token=await googleAccessToken(user);
    return async(letter:Letter,id:string,_actorEmail:string):Promise<Receipt>=>{
      if(letter.anonymous || letter.senderEmail!==user.email)throw new Error("Invalid sender");
      const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({raw:mimeFor(letter,id,user.email)}),signal:AbortSignal.timeout(30000)});
      if(!response.ok)return {ok:false,uncertain:response.status>=500||response.status===408};
      const data=await response.json() as {id?:string};if(!data.id)throw new Error("Missing provider receipt");return {ok:true,id:data.id};
    };
  }
  if(scriptConfigured()) return async(letter:Letter,id:string,actorEmail:string):Promise<Receipt>=>{
    const payload=JSON.stringify({version:1,id,timestamp:Date.now(),actorEmail,recipientEmail:letter.recipientEmail,anonymous:letter.anonymous===true,subject:subjectFor(letter),text:plainLetter(letter),html:renderLetter(letter)});
    const key=await crypto.subtle.importKey("raw",new TextEncoder().encode(env.APPS_SCRIPT_SECRET!),{name:"HMAC",hash:"SHA-256"},false,["sign"]);
    const signature=base64url(new Uint8Array(await crypto.subtle.sign("HMAC",key,new TextEncoder().encode(payload))));
    const response=await fetch(env.APPS_SCRIPT_URL!,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({payload,signature}),signal:AbortSignal.timeout(45000),redirect:"follow"});
    if(!response.ok) return {ok:false,uncertain:response.status>=500||response.status===408};
    const data=await response.json() as {ok?:boolean;id?:string;uncertain?:boolean};
    if(data.ok===true&&typeof data.id==="string")return {ok:true,id:data.id};
    if(data.ok===false&&typeof data.uncertain==="boolean")return {ok:false,uncertain:data.uncertain};
    throw new Error("Missing Apps Script receipt");
  };
  const token=await accessToken();
  return async(letter:Letter,id:string,_actorEmail:string):Promise<Receipt>=>{
    const response=await fetch("https://gmail.googleapis.com/gmail/v1/users/"+encodeURIComponent(MAILBOX)+"/messages/send",{method:"POST",headers:{Authorization:"Bearer "+token,"Content-Type":"application/json"},body:JSON.stringify({raw:mimeFor(letter,id)}),signal:AbortSignal.timeout(30000)});
    if(!response.ok)return {ok:false,uncertain:response.status>=500||response.status===408};
    const data=await response.json() as {id?:string};if(!data.id)throw new Error("Missing provider receipt");return {ok:true,id:data.id};
  };
}
