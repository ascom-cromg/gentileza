import { identity, json, store } from "@/lib/correio/server";
import { normalize } from "@/lib/correio/domain";
export async function GET(request:Request) {
  const user=await identity(request);
  if (!user?.corporate) return json({error:"Entre com sua conta @cromg.org.br para escolher um destinatário."},user?403:401);
  const query=(new URL(request.url).searchParams.get("q")||"").trim();
  if(query.length<2 || query.length>100) return json({people:[]});
  try {
    const pattern="%"+normalize(query).replace(/[\\%_]/g,"\\$&")+"%";
    const result=await store().prepare("SELECT name,email FROM staff WHERE active=1 AND search_text LIKE ? ESCAPE '\\' ORDER BY name COLLATE NOCASE LIMIT 15").bind(pattern).all();
    return json({people:result.results});
  } catch { return json({error:"Não foi possível consultar a lista. Tente novamente."},503); }
}
