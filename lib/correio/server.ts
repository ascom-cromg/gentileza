import { env } from "cloudflare:workers";
import { corporateEmail, MAILBOX, SITE_URL } from "./domain";
export function json(value: unknown, status=200) { return Response.json(value,{status,headers:{"Cache-Control":"private, no-store",Vary:"Cookie","X-Content-Type-Options":"nosniff"}}); }
export function store() { if (!env.DB) throw new Error("O correio está em preparação."); return env.DB; }
export function identity(request: Request) {
  const id=request.headers.get("oai-authenticated-user-id"), email=request.headers.get("oai-authenticated-user-email")?.toLowerCase();
  if (!id || !email) return null;
  let name=request.headers.get("oai-authenticated-user-full-name") || "";
  if (request.headers.get("oai-authenticated-user-full-name-encoding")==="percent-encoded-utf-8") try { name=decodeURIComponent(name); } catch { name=""; }
  return { id,email,name:name || email.split("@")[0],corporate:corporateEmail(email),admin:email===MAILBOX };
}
export function canMutate(request: Request) {
  const origin=request.headers.get("origin");
  return !!origin && (origin===new URL(request.url).origin || origin===SITE_URL || process.env.NODE_ENV==="development" && origin==="http://127.0.0.1:4173") && request.headers.get("sec-fetch-site")!=="cross-site" && request.headers.get("content-type")?.includes("application/json");
}
export function scriptConfigured() { return !!(env.APPS_SCRIPT_URL && /^https:\/\/script\.google\.com\/macros\/s\/[a-zA-Z0-9_-]+\/exec$/.test(env.APPS_SCRIPT_URL) && env.APPS_SCRIPT_SECRET && env.APPS_SCRIPT_SECRET.length>=32); }
export function configured() { return scriptConfigured() || !!(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN); }
export async function digest(value:string) { const bytes=await crypto.subtle.digest("SHA-256",new TextEncoder().encode(value)); return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,"0")).join(""); }
export async function accessToken() {
  if (!(env.GMAIL_CLIENT_ID && env.GMAIL_CLIENT_SECRET && env.GMAIL_REFRESH_TOKEN)) throw new Error("O envio de e-mails ainda está sendo configurado pela equipe organizadora.");
  const response=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({client_id:env.GMAIL_CLIENT_ID!,client_secret:env.GMAIL_CLIENT_SECRET!,refresh_token:env.GMAIL_REFRESH_TOKEN!,grant_type:"refresh_token"}),signal:AbortSignal.timeout(15000)});
  const data=await response.json() as {access_token?:string};
  if (!response.ok || !data.access_token) throw new Error("A conexão de envio precisa ser revisada pela equipe organizadora.");
  return data.access_token;
}
