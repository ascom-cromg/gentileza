import {env} from 'cloudflare:workers';
import {createRemoteJWKSet,jwtVerify} from 'jose';
import {MAILBOX,SITE_URL,corporateEmail} from './domain';
import {DOMAIN,SEND_SCOPE,SESSION_COOKIE,FLOW_COOKIE,SESSION_TTL,randomToken,hash,seal,unseal,cookie,cookieHeader,safeReturn,validClaims} from './auth-core';
export type GoogleUser={id:string;email:string;name:string;corporate:true;admin:boolean;sessionHash:string};
type SessionRow={id:string;subject:string;email:string;name:string;tokens:string;expires_at:number};
type Tokens={accessToken:string;refreshToken?:string;expiresAt:number};
type Flow={state:string;nonce:string;verifier:string;expires:number;returnTo:string};
const jwks=createRemoteJWKSet(new URL('https://www.googleapis.com/oauth2/v3/certs'));
const redirectUri=SITE_URL+'/api/auth/google/callback';
export function googleConfigured(){return !!(env.GOOGLE_CLIENT_ID&&env.GOOGLE_CLIENT_SECRET&&env.GOOGLE_TOKEN_KEY&&/^[A-Za-z0-9_-]{43}$/.test(env.GOOGLE_TOKEN_KEY));}
function db(){if(!env.DB)throw new Error('Database unavailable');return env.DB;}
function redirect(path:string,clearFlow=false){const headers=new Headers({Location:path,'Cache-Control':'no-store','Referrer-Policy':'no-referrer'});if(clearFlow)headers.append('Set-Cookie',cookieHeader(FLOW_COOKIE,'',0));return new Response(null,{status:303,headers});}
export async function startGoogle(request:Request){
 if(!googleConfigured())return redirect('/acesso?erro=configuracao');
 const flow:Flow={state:randomToken(),nonce:randomToken(),verifier:randomToken(),expires:Date.now()+600000,returnTo:safeReturn(new URL(request.url).searchParams.get('returnTo'))};
 try{
  await db().prepare('DELETE FROM google_flows WHERE expires_at<?').bind(Date.now()).run();
  await db().prepare('INSERT INTO google_flows (id,expires_at) VALUES (?,?)').bind(await hash(flow.state),flow.expires).run();
  const url=new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search=new URLSearchParams({client_id:env.GOOGLE_CLIENT_ID!,redirect_uri:redirectUri,response_type:'code',scope:'openid email profile '+SEND_SCOPE,state:flow.state,nonce:flow.nonce,code_challenge:await hash(flow.verifier),code_challenge_method:'S256',access_type:'offline',prompt:'select_account',hd:DOMAIN}).toString();
  const response=redirect(url.toString());response.headers.append('Set-Cookie',cookieHeader(FLOW_COOKIE,await seal(flow,env.GOOGLE_TOKEN_KEY!,'oauth-flow'),600));return response;
 }catch{return redirect('/acesso?erro=indisponivel');}
}
export async function finishGoogle(request:Request){
 if(!googleConfigured())return redirect('/acesso?erro=configuracao',true);
 try{
  const url=new URL(request.url),flow=await unseal<Flow>(cookie(request,FLOW_COOKIE),env.GOOGLE_TOKEN_KEY!,'oauth-flow');
  if(!flow.state||flow.state!==url.searchParams.get('state')||flow.expires<Date.now())throw new Error('Invalid OAuth state');
  const used=await db().prepare('DELETE FROM google_flows WHERE id=? AND expires_at>? RETURNING id').bind(await hash(flow.state),Date.now()).first();if(!used)throw new Error('Used OAuth state');
  if(url.searchParams.has('error'))return redirect('/acesso?erro=permissao',true);
  const code=url.searchParams.get('code');if(!code||code.length>4000)throw new Error('Missing code');
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({code,client_id:env.GOOGLE_CLIENT_ID!,client_secret:env.GOOGLE_CLIENT_SECRET!,redirect_uri:redirectUri,grant_type:'authorization_code',code_verifier:flow.verifier}),signal:AbortSignal.timeout(15000)});
  if(!response.ok)throw new Error('Token exchange failed');
  const data=await response.json() as {access_token?:string;refresh_token?:string;expires_in?:number;scope?:string;id_token?:string};
  if(!data.id_token||!data.access_token||!data.scope?.split(' ').includes(SEND_SCOPE))return redirect('/acesso?erro=permissao',true);
  const {payload}=await jwtVerify(data.id_token,jwks,{issuer:['https://accounts.google.com','accounts.google.com'],audience:env.GOOGLE_CLIENT_ID,algorithms:['RS256'],requiredClaims:['sub','exp','iat','email','email_verified','nonce','hd']});
  if(!validClaims(payload,flow.nonce,env.GOOGLE_CLIENT_ID!))return redirect('/acesso?erro=dominio',true);
  const email=String(payload.email).toLowerCase();
  if(!await db().prepare('SELECT email FROM staff WHERE email=? AND active=1').bind(email).first())return redirect('/acesso?erro=conta',true);
  const token=randomToken(),id=await hash(token),name=(typeof payload.name==='string'?payload.name:email.split('@')[0]).slice(0,80);
  const tokens:Tokens={accessToken:data.access_token,refreshToken:data.refresh_token,expiresAt:Date.now()+Math.min(data.expires_in||3600,3600)*1000};
  await db().prepare('DELETE FROM google_sessions WHERE expires_at<?').bind(Date.now()).run();
  await db().prepare('INSERT INTO google_sessions (id,subject,email,name,tokens,expires_at) VALUES (?,?,?,?,?,?)').bind(id,String(payload.sub),email,name,await seal(tokens,env.GOOGLE_TOKEN_KEY!,'tokens:'+id),Date.now()+SESSION_TTL*1000).run();
  const previous=cookie(request,SESSION_COOKIE);if(previous)await db().prepare('DELETE FROM google_sessions WHERE id=?').bind(await hash(previous)).run();
  const result=redirect(flow.returnTo,true);result.headers.append('Set-Cookie',cookieHeader(SESSION_COOKIE,token,SESSION_TTL));return result;
 }catch{return redirect('/acesso?erro=validacao',true);}
}
export async function googleIdentity(request:Request):Promise<GoogleUser|null>{
 if(!googleConfigured())return null;
 const token=cookie(request,SESSION_COOKIE);if(!/^[A-Za-z0-9_-]{43}$/.test(token))return null;
 try{const row=await db().prepare('SELECT g.* FROM google_sessions g JOIN staff s ON s.email=g.email AND s.active=1 WHERE g.id=? AND g.expires_at>?').bind(await hash(token),Date.now()).first<SessionRow>();if(!row||!corporateEmail(row.email))return null;return {id:'google:'+row.subject,email:row.email,name:row.name,corporate:true,admin:row.email===MAILBOX,sessionHash:row.id};}catch{return null;}
}
export async function googleAccessToken(user:GoogleUser){
 const row=await db().prepare('SELECT * FROM google_sessions WHERE id=? AND subject=? AND expires_at>?').bind(user.sessionHash,user.id.replace(/^google:/,''),Date.now()).first<SessionRow>();
 if(!row||row.email!==user.email)throw new Error('Entre novamente com Google.');
 let tokens=await unseal<Tokens>(row.tokens,env.GOOGLE_TOKEN_KEY!,'tokens:'+row.id);
 if(tokens.expiresAt>Date.now()+60000)return tokens.accessToken;
 if(!tokens.refreshToken){await db().prepare('DELETE FROM google_sessions WHERE id=?').bind(row.id).run();throw new Error('Entre novamente com Google.');}
 const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'refresh_token',refresh_token:tokens.refreshToken,client_id:env.GOOGLE_CLIENT_ID!,client_secret:env.GOOGLE_CLIENT_SECRET!}),signal:AbortSignal.timeout(15000)});
 if(!response.ok){if(response.status===400||response.status===401)await db().prepare('DELETE FROM google_sessions WHERE id=?').bind(row.id).run();throw new Error('Entre novamente com Google para autorizar o envio.');}
 const data=await response.json() as {access_token?:string;expires_in?:number;refresh_token?:string;scope?:string};
 if(!data.access_token||data.scope&&!data.scope.split(' ').includes(SEND_SCOPE))throw new Error('Permissão de envio indisponível.');
 tokens={accessToken:data.access_token,refreshToken:data.refresh_token||tokens.refreshToken,expiresAt:Date.now()+Math.min(data.expires_in||3600,3600)*1000};
 await db().prepare('UPDATE google_sessions SET tokens=? WHERE id=?').bind(await seal(tokens,env.GOOGLE_TOKEN_KEY!,'tokens:'+row.id),row.id).run();return tokens.accessToken;
}
export async function logoutGoogle(request:Request){
 if(request.headers.get('origin')!==SITE_URL||request.headers.get('sec-fetch-site')==='cross-site')return new Response('Pedido inválido.',{status:403});
 const token=cookie(request,SESSION_COOKIE);if(token)await db().prepare('DELETE FROM google_sessions WHERE id=?').bind(await hash(token)).run();
 const result=redirect('/');result.headers.append('Set-Cookie',cookieHeader(SESSION_COOKIE,'',0));result.headers.append('Set-Cookie',cookieHeader(FLOW_COOKIE,'',0));return result;
}
