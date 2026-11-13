import { env } from "cloudflare:workers";
import { canMutate, configured, digest, identity, json, store } from "@/lib/correio/server";
import { MAILBOX, normalize, parseDirectory } from "@/lib/correio/domain";
export async function GET(request:Request) {
  if(!(await identity(request))?.admin) return json({error:"Acesso restrito à equipe organizadora."},403);
  try { const stats=await store().prepare("SELECT COUNT(*) AS count,MAX(updated_at) AS updatedAt FROM staff WHERE active=1").first(); return json({mailReady:configured(),mailbox:MAILBOX,stats}); }
  catch { return json({error:"A configuração está sendo preparada. Tente novamente."},503); }
}
export async function POST(request:Request) {
  const admin=(await identity(request))?.admin;
  const importLease=!!env.DIRECTORY_IMPORT_HASH && Date.parse(env.DIRECTORY_IMPORT_EXPIRES_AT||"")>Date.now();
  if((!admin&&!importLease) || !canMutate(request)) return json({error:"Acesso restrito à equipe organizadora."},403);
  let authorizedHash:string|null=null;
  try {
    const raw=await request.text();if(raw.length>180000) return json({error:"Use um arquivo de até 150 KB."},413);
    let data;try{data=JSON.parse(raw);}catch{return json({error:"Confira o arquivo CSV."},400);}
    if(typeof data?.csv!=="string") return json({error:"Selecione um CSV com Nome e E-mail."},400);
    // A short-lived import capability is bound to one exact user-approved file.
    // It cannot authorize reads, other lists, mail delivery, or later replays.
    if(!admin) {
      if(typeof data.nonce!=="string" || data.nonce.length<24 || data.nonce.length>150) return json({error:"Importação não autorizada."},403);
      const expected=await digest(data.nonce+"\n"+data.csv);
      if(expected!==env.DIRECTORY_IMPORT_HASH) return json({error:"Importação não autorizada."},403);
      authorizedHash=expected;
    }
    const people=parseDirectory(data.csv),db=store(),now=Date.now();
    const activeCount=people.filter(person=>person.active).length;
    if(authorizedHash) {
      const prior=await db.prepare("SELECT total,active_count AS activeCount FROM directory_imports WHERE id=?").bind(authorizedHash).first<{total:number;activeCount:number}>();
      if(prior) return json({count:prior.total,activeCount:prior.activeCount,alreadyImported:true});
    }
    const existingDepartments = new Map((await db.prepare("SELECT email,department FROM staff").all<{email:string;department:string|null}>()).results.map(p=>[p.email,p.department]));
    const statements=authorizedHash?[db.prepare("INSERT INTO directory_imports (id,total,active_count,imported_at) VALUES (?,?,?,?)").bind(authorizedHash,people.length,activeCount,now)]:[];
    statements.push(db.prepare("UPDATE staff SET active=0"));
    for(let i=0;i<people.length;i+=16) {
      const chunk=people.slice(i,i+16);
      statements.push(db.prepare("INSERT INTO staff (email,name,search_text,active,updated_at,department) VALUES "+chunk.map(()=>"(?,?,?,?,?,?)").join(",")+" ON CONFLICT(email) DO UPDATE SET name=excluded.name,search_text=excluded.search_text,active=excluded.active,updated_at=excluded.updated_at,department=COALESCE(excluded.department,staff.department)").bind(...chunk.flatMap(person=>[person.email,person.name,normalize(person.name+" "+person.email+" "+(person.department??existingDepartments.get(person.email)??"")),person.active?1:0,now,person.department??null])));
    }
    await db.batch(statements);return json({count:people.length,activeCount,inactiveCount:people.length-activeCount,updatedAt:now});
  } catch(error) {
    if(authorizedHash) { const prior=await store().prepare("SELECT total,active_count AS activeCount FROM directory_imports WHERE id=?").bind(authorizedHash).first<{total:number;activeCount:number}>();if(prior)return json({count:prior.total,activeCount:prior.activeCount,alreadyImported:true}); }
    return json({error:error instanceof Error && /CSV|linha|colunas|colaboradores|duplicado|aspas/.test(error.message)?error.message:"Não foi possível atualizar a lista. A lista anterior foi mantida."},400);
  }
}
