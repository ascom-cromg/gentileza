export const DOMAIN = "cromg.org.br";
export const MAILBOX = "ascom@cromg.org.br";
export const SITE_URL = "https://gentileza-circula-cromg.ascom946966.chatgpt.site";
export const themes = {
  butter: { label: "Raio de sol", background: "#f5e6a9", ink: "#66572b" },
  lavender: { label: "Carinho lilás", background: "#e2d9f1", ink: "#6f5a88" },
  green: { label: "Abraço verde", background: "#dfeac6", ink: "#5f7346" },
  peach: { label: "Afeto pêssego", background: "#f4d6c5", ink: "#9c604b" },
} as const;
export const topics = { agradecimento: "Um obrigado", reconhecimento: "Você inspira", "so-porque-sim": "Só porque sim" } as const;
export type Theme = keyof typeof themes;
export type Topic = keyof typeof topics;
export type Person = { name: string; email: string; department?: string | null };
export type DirectoryPerson = Person & { active: boolean };
export const ANONYMOUS_NAME = "Alguém que te deseja bem";
export type Letter = { senderName: string; senderEmail: string; recipientName: string; recipientEmail: string; message: string; color: Theme; category: Topic; anonymous?: boolean };
export function normalize(value: string) { return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase(); }
export function corporateEmail(value: unknown): value is string {
  return typeof value === "string" && value.length <= 120 && /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+@cromg\.org\.br$/i.test(value) && !value.split("@")[0].includes("..");
}
export function validName(value: unknown): value is string { return typeof value === "string" && value.trim().length >= 2 && value.trim().length <= 80 && !/[\u0000-\u001f\u007f]/.test(value); }
export function validateLetter(value: unknown) {
  if (!value || typeof value !== "object") throw new Error("Confira os campos da mensagem.");
  const data = value as Record<string, unknown>;
  if (typeof data.id !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(data.id)) throw new Error("Atualize a página e tente de novo.");
  if (data.anonymous !== undefined && typeof data.anonymous !== "boolean") throw new Error("Confira a opção de envio anônimo.");
  const anonymous = data.anonymous === true;
  if (!anonymous && !validName(data.senderName)) throw new Error("Escreva seu nome, com 2 a 80 caracteres.");
  if (!corporateEmail(data.recipientId)) throw new Error("Escolha a pessoa na lista de destinatários.");
  if (typeof data.message !== "string" || data.message.trim().length < 5 || data.message.trim().length > 600 || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(data.message)) throw new Error("Escreva uma mensagem de 5 a 600 caracteres.");
  if (typeof data.color !== "string" || !Object.hasOwn(themes, data.color) || typeof data.category !== "string" || !Object.hasOwn(topics, data.category)) throw new Error("Escolha um estilo para o seu e-mail.");
  return { id: data.id, senderName: anonymous ? ANONYMOUS_NAME : (data.senderName as string).trim(), anonymous, recipientId: data.recipientId.toLowerCase(), message: data.message.trim(), color: data.color as Theme, category: data.category as Topic };
}

export function parseDirectory(csv: string): DirectoryPerson[] {
  if (!csv.trim() || csv.length > 150000) throw new Error("Use um CSV de até 150 KB com as colunas Nome e E-mail.");
  const text = csv.replace(/^\uFEFF/, "");
  const firstLine = text.split(/\r?\n/, 1)[0];
  const separator = firstLine.includes(";") ? ";" : firstLine.includes("\t") ? "\t" : ",";
  const rows: string[][] = [];
  let row: string[] = [], field = "", quoted = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') { if (quoted && text[i+1] === '"') { field += '"'; i++; } else quoted = !quoted; }
    else if (!quoted && char === separator) { row.push(field.trim()); field = ""; }
    else if (!quoted && (char === "\n" || char === "\r")) { row.push(field.trim()); if (row.some(Boolean)) rows.push(row); row=[]; field=""; if (char === "\r" && text[i+1] === "\n") i++; }
    else field += char;
  }
  if (quoted) throw new Error("Confira as aspas do CSV.");
  row.push(field.trim()); if (row.some(Boolean)) rows.push(row);
  const headers = rows.shift()?.map(value => normalize(value).replace(/[^a-z]/g, ""));
  const nameIndex = headers?.indexOf("nome") ?? -1;
  const firstNameIndex = headers?.indexOf("firstname") ?? -1, lastNameIndex = headers?.indexOf("lastname") ?? -1;
  const emailIndex = headers?.includes("email") ? headers.indexOf("email") : headers?.indexOf("emailaddress") ?? -1;
  const departmentIndex = headers?.indexOf("departamento") ?? -1;
  const statusIndex = headers?.includes("status") ? headers.indexOf("status") : headers?.indexOf("ativo") ?? -1;
  if ((nameIndex < 0 && firstNameIndex < 0) || emailIndex < 0) throw new Error("Use as colunas Nome e E-mail ou a exportação First Name, Last Name e Email Address do Google.");
  if (!rows.length || rows.length > 500) throw new Error("Importe de 1 a 500 colaboradores por lista.");
  const seen = new Set<string>();
  return rows.map((values, i) => {
    const name = nameIndex >= 0 ? values[nameIndex] : [values[firstNameIndex],lastNameIndex >= 0 ? values[lastNameIndex] : ""].filter(Boolean).join(" ").trim();
    const email = values[emailIndex]?.toLowerCase();
    if (!validName(name) || !corporateEmail(email)) throw new Error("Confira o nome e o e-mail @cromg.org.br na linha " + (i+2) + ".");
    if (seen.has(email)) throw new Error("E-mail duplicado na linha " + (i+2) + ".");
    const status = statusIndex >= 0 ? normalize(values[statusIndex] || "").trim() : "active";
    if (!["active","ativo","ativa","sim","true","1","suspended","suspenso","suspensa","inativo","inativa","nao","false","0"].includes(status)) throw new Error("Confira o Status ou Ativo na linha " + (i+2) + ".");
    const active = ["active","ativo","ativa","sim","true","1"].includes(status);
    const department = departmentIndex >= 0 ? (values[departmentIndex] || "").trim() : undefined;
    if (department !== undefined && (department.length > 120 || /[\u0000-\u001f\u007f]/.test(department))) throw new Error("Confira o Departamento na linha " + (i+2) + ".");
    seen.add(email); return { name: name.trim(), email, active, ...(department !== undefined ? {department} : {}) };
  });
}
