import { configured, identity, json, store } from "@/lib/correio/server";
import { chatGPTSignInPath, chatGPTSignOutPath } from "@/app/chatgpt-auth";
export async function GET(request:Request) {
  const user=identity(request);
  let directoryReady=false;
  try { const count=await store().prepare("SELECT COUNT(*) AS count FROM staff WHERE active=1").first<{count:number}>(); directoryReady=!!count?.count; } catch {}
  return json({state:!user?"guest":user.corporate?"member":"denied",user:user?{name:user.name,email:user.email,admin:user.admin}:null,mailReady:configured(),directoryReady,signIn:chatGPTSignInPath("/#escrever"),signOut:chatGPTSignOutPath("/")});
}
