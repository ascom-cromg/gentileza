"use client";
import { useCallback, useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { ArrowUpRight, ArrowRight, ArrowDown, Mail, Heart, Search, X, Check, CheckCheck, LockKeyhole, LoaderCircle, Sparkles, Eye, LogOut, Settings2, RefreshCw } from "lucide-react";
import { EnvelopeArt, Flower } from "./motifs";
import { renderLetter, subjectFor } from "@/lib/correio/template";
import { themes, topics, type Person, type Theme, type Topic, type Letter } from "@/lib/correio/domain";

type Session={state:"guest"|"member"|"denied";user:{name:string;email:string;admin:boolean}|null;mailReady:boolean;anonymousReady:boolean;googleReady:boolean;directoryReady:boolean;signIn:string;signOut:string};
type Draft={senderName:string;message:string;color:Theme;category:Topic;anonymous:boolean};
const blank:Draft={senderName:"",message:"",color:"butter",category:"agradecimento",anonymous:false};

export default function Home() {
  const [session,setSession]=useState<Session|null>(null),[sessionError,setSessionError]=useState("");
  const [draft,setDraft]=useState<Draft>(blank),[draftReady,setDraftReady]=useState(false);
  const [recipient,setRecipient]=useState<Person|null>(null),[search,setSearch]=useState("");
  const [people,setPeople]=useState<Person[]>([]),[searching,setSearching]=useState(false),[searchError,setSearchError]=useState("");
  const [open,setOpen]=useState(false),[active,setActive]=useState(-1);
  const [sending,setSending]=useState(false),[uncertain,setUncertain]=useState(false),[formError,setFormError]=useState("");
  const [success,setSuccess]=useState<Person|null>(null),[checking,setChecking]=useState(false);
  const previewDialog=useRef<HTMLDialogElement>(null),howDialog=useRef<HTMLDialogElement>(null);
  const requestKey=useRef<{payload:string;id:string}|null>(null),searchInput=useRef<HTMLInputElement>(null);
  const member=session?.state==="member",locked=sending||uncertain;
  const loadSession=useCallback(async()=>{
    try {const r=await fetch("/api/correio/session",{cache:"no-store"});if(!r.ok)throw new Error();const data=await r.json() as Session;setSession(data);setSessionError("");if(data.state==="member")setDraft(d=>({...d,senderName:d.senderName||data.user?.name||""}));}
    catch{setSessionError("Não foi possível verificar seu acesso agora.");}
  },[]);
  useEffect(()=>{
    try{
      const saved=JSON.parse(sessionStorage.getItem("correio-draft")||"null");
      if(saved&&typeof saved.senderName==="string"&&typeof saved.message==="string")setDraft({anonymous:saved.anonymous===true,senderName:saved.senderName.slice(0,80),message:saved.message.slice(0,600),color:Object.hasOwn(themes,saved.color)?saved.color:"butter",category:Object.hasOwn(topics,saved.category)?saved.category:"agradecimento"});
      const pending=JSON.parse(sessionStorage.getItem("correio-submission")||"null");
      if(pending&&typeof pending.id==="string"&&typeof pending.payload==="string"){requestKey.current=pending;if(pending.status==="pending"||pending.status==="unknown")setUncertain(true);}
    }catch{}
    setDraftReady(true);void loadSession();
  },[loadSession]);
  useEffect(()=>{if(draftReady)try{sessionStorage.setItem("correio-draft",JSON.stringify(draft));}catch{}},[draft,draftReady]);

  const verify=useCallback(async()=>{
    if(!requestKey.current||!member)return;
    setChecking(true);
    try{
      const r=await fetch("/api/correio/send?id="+encodeURIComponent(requestKey.current.id),{cache:"no-store"});
      const data=await r.json() as {status?:string;recipient?:Person;error?:string};if(!r.ok)throw new Error(data.error);
      if(data.recipient){setRecipient(data.recipient);setSearch(data.recipient.name);}
      if(data.status==="sent"&&data.recipient){setSuccess(data.recipient);setUncertain(false);setDraft(d=>({...blank,senderName:d.senderName,color:d.color}));requestKey.current=null;try{sessionStorage.removeItem("correio-submission");}catch{} }
      else if(data.status==="failed"||data.status==="not_started"){setUncertain(false);setFormError("O envio não foi concluído. Você pode tentar novamente.");try{sessionStorage.setItem("correio-submission",JSON.stringify({...requestKey.current,status:"failed"}));}catch{}}
      else setFormError("O envio ainda precisa de confirmação. A equipe organizadora pode conferir o e-mail antes de uma nova tentativa.");
    }catch{setFormError("Não foi possível conferir o envio agora. Tente verificar novamente mais tarde.");}
    finally{setChecking(false);}
  },[member]);
  useEffect(()=>{if(member&&uncertain)void verify();},[member,verify]);

  useEffect(()=>{
    if(!member||!session?.directoryReady||recipient||search.trim().length<2){setPeople([]);setSearching(false);return;}
    const abort=new AbortController();setSearching(true);setSearchError("");
    const timer=setTimeout(async()=>{
      try{const r=await fetch("/api/correio/recipients?q="+encodeURIComponent(search.trim()),{signal:abort.signal,cache:"no-store"});const data=await r.json() as {people:Person[];error?:string};if(!r.ok)throw new Error(data.error);setPeople(data.people);setActive(-1);}
      catch(error){if(!abort.signal.aborted)setSearchError(error instanceof Error?error.message:"Não foi possível consultar a lista.");}
      finally{if(!abort.signal.aborted)setSearching(false);}
    },250);
    return()=>{abort.abort();clearTimeout(timer);};
  },[search,member,session?.directoryReady,recipient]);

  function update<K extends keyof Draft>(key:K,value:Draft[K]){setDraft(d=>({...d,[key]:value}));setFormError("");}
  function choose(person:Person){setRecipient(person);setSearch(person.name);setOpen(false);setPeople([]);setFormError("");}
  function searchKeys(event:KeyboardEvent<HTMLInputElement>){
    if(event.key==="Escape"){setOpen(false);return;}
    if(event.key==="ArrowDown"){event.preventDefault();setOpen(true);setActive(i=>Math.min(i+1,people.length-1));}
    if(event.key==="ArrowUp"){event.preventDefault();setActive(i=>Math.max(i-1,0));}
    if(event.key==="Enter"){event.preventDefault();if(open&&active>=0&&people[active])choose(people[active]);}
  }
  function jump(){document.getElementById("escrever")?.scrollIntoView({behavior:window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth",block:"start"});}
  async function send(event:FormEvent<HTMLFormElement>){
    event.preventDefault();if(locked||!member)return;
    if(!recipient){setFormError("Busque pelo nome e selecione a pessoa na lista.");searchInput.current?.focus();return;}
    if(draft.message.trim().length<5||!draft.anonymous&&draft.senderName.trim().length<2){setFormError(draft.anonymous?"Escreva uma mensagem com pelo menos 5 caracteres.":"Preencha seu nome e escreva uma mensagem com pelo menos 5 caracteres.");return;}
    const value={senderName:draft.anonymous?"":draft.senderName.trim(),anonymous:draft.anonymous,message:draft.message.trim(),color:draft.color,category:draft.category,recipientId:recipient.email};
    const payload=JSON.stringify(value);if(requestKey.current?.payload!==payload)requestKey.current={payload,id:crypto.randomUUID()};
    setSending(true);setFormError("");
    try{sessionStorage.setItem("correio-submission",JSON.stringify({...requestKey.current,status:"pending"}));}catch{}
    try{
      const r=await fetch("/api/correio/send",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...value,id:requestKey.current.id})});
      const result=await r.json() as {sent?:boolean;recipient?:Person;error?:string;uncertain?:boolean};
      if(!r.ok||result.sent!==true||!result.recipient){
        const unknown=!!result.uncertain;setUncertain(unknown);try{sessionStorage.setItem("correio-submission",JSON.stringify({...requestKey.current,status:unknown?"unknown":"failed"}));}catch{}
        setFormError(result.error||"O envio não foi concluído. Sua mensagem continua aqui.");void loadSession();return;
      }
      setSuccess(result.recipient);setDraft(d=>({...blank,senderName:d.senderName,color:d.color}));setRecipient(null);setSearch("");requestKey.current=null;try{sessionStorage.removeItem("correio-submission");}catch{}
    }catch{setUncertain(true);setFormError("Ainda não recebemos a confirmação. Verifique o envio antes de tentar novamente.");try{sessionStorage.setItem("correio-submission",JSON.stringify({...requestKey.current,status:"unknown"}));}catch{}}
    finally{setSending(false);}
  }
  const letter:Letter={anonymous:draft.anonymous,senderName:draft.senderName.trim()||"seu nome",senderEmail:member?session.user?.email||"":"seu.email@cromg.org.br",recipientName:recipient?.name||"alguém especial",recipientEmail:recipient?.email||"",message:draft.message.trim()||"O seu cuidado faz a diferença. Que bom ter você por perto — hoje e em todos os outros dias.",color:draft.color,category:draft.category};
  const emailHtml=renderLetter(letter);

  return <>
    <header className="site-header"><div className="header-inner"><a className="brand" href="#inicio" aria-label="Gentileza circula, início"><Flower/><span>gentileza<br/>circula<span className="brand-dot">.</span></span></a><span className="header-caption">Agora o carinho tem endereço.<br/><strong>Correio de Gentilezas · CRO-MG</strong></span><nav aria-label="Navegação principal"><a className="atelier-home-link" href="/atelie"><Sparkles size={14}/> Criar um cartão</a><button className="text-button how-button" onClick={()=>howDialog.current?.showModal()}>Como funciona</button>{member?<div className="account"><span className="account-dot"/><span>{session.user?.email}</span>{session.user?.admin&&<a href="/configuracao" aria-label="Configurar correio"><Settings2 size={16}/></a>}<form action={session.signOut} method="post"><button type="submit" className="text-button" aria-label="Sair da conta"><LogOut size={15}/></button></form></div>:<a className="button button-dark header-login" href={session?.state==="denied"?session.signOut:session?.signIn||"/api/auth/google/start"} target="_top"><LockKeyhole size={14}/>{session?.state==="denied"?"Trocar conta":"Entrar com Google"}<ArrowUpRight size={15}/></a>}</nav></div></header>
    <main id="inicio">
      <section className="hero page-width"><div className="hero-copy"><div className="eyebrow"><Flower/> DIA DA GENTILEZA. E TODOS OS OUTROS.</div><h1>Uma gentileza.<br/><span className="orange-word">Um e-mail.</span><br/>Um dia melhor.</h1><p>Sabe aquele carinho que você vive deixando pra depois?<br className="desktop-break"/> Escreva agora. A gente entrega na caixa de entrada de alguém.</p><button className="hero-link" onClick={jump}>Quero mandar uma gentileza <ArrowDown size={16}/></button></div><EnvelopeArt/></section>
      <div className="kindness-strip" aria-hidden="true"><div><span>ESSE CARINHO TEM ENDEREÇO CERTO</span><Flower/><span>UMA MENSAGEM. UM SORRISO.</span><Flower/><span>DE CORAÇÃO, DIRETO PARA O E-MAIL</span><Flower/><span>GENTILEZA GERA GENTILEZA</span><Flower/></div></div>
      <section className="compose-section page-width" id="escrever" aria-labelledby="compose-title"><div className="section-intro"><div><span className="eyebrow">TEM ALGUÉM QUE MERECE OUVIR ISSO</span><h2 id="compose-title">Seu carinho, em palavras<Flower/></h2><p>Escolha uma pessoa. Escreva com afeto. Deixe a gentileza chegar.</p></div><span className="email-only"><Mail size={15}/> Entrega individual por e-mail</span></div>
        <div className="mail-layout"><div className="compose-column">
          {success?<div className="sent-card"><div className="sent-envelope"><Mail size={48} strokeWidth={1.2}/><span><Check size={19}/></span></div><span className="eyebrow">GENTILEZA ENVIADA</span><h2>Seu carinho já<br/>seguiu viagem.</h2><p>Seu e-mail foi enviado para <strong>{success.name}</strong>.</p><span className="sent-address">{success.email}</span><p className="sent-quote">Que essas palavras encontrem um sorriso do outro lado.</p><button className="button button-orange" onClick={()=>{setSuccess(null);setFormError("");}}>Mandar mais uma gentileza <ArrowUpRight size={17}/></button></div>:<form className="letter-form" onSubmit={send}>
            <div className="form-top"><span className="eyebrow">PAPEL, CANETA E UM POUCO DE AFETO</span><span className="little-stamp"><Mail size={20}/></span></div>
            {(!member||!(draft.anonymous?session?.anonymousReady:session?.mailReady)||!session?.directoryReady||sessionError)&&<div className={"access-notice"+(session?.state==="denied"?" denied":"")}><LockKeyhole size={18}/><div><strong>{sessionError?"Vamos conferir seu acesso?":session?.state==="denied"?"Esse correio é para quem faz o CRO-MG.":!member?!session?.googleReady?"Estamos preparando a entrada com Google.":"O carinho começa com seu e-mail corporativo.":"Nosso correio está recebendo os últimos cuidados."}</strong><p>{sessionError?<button type="button" className="text-button" onClick={()=>void loadSession()}>Tentar novamente <RefreshCw size={12}/></button>:session?.state==="denied"?"Entre com uma conta cadastrada com e-mail @cromg.org.br para participar.":!member&&!session?.googleReady?"A conexão com o Google está sendo configurada. Em breve você poderá entrar com sua conta @cromg.org.br.":!member?"Entre com Google usando seu e-mail @cromg.org.br. Você autoriza o envio pela sua conta, sem liberar a leitura da caixa de entrada.":"A equipe organizadora precisa concluir "+(!session.directoryReady&&!(draft.anonymous?session.anonymousReady:session.mailReady)?"a lista de destinatários e a ativação dos envios.":!session.directoryReady?"a lista de destinatários.":draft.anonymous?"a ativação do envio anônimo.":"a ativação dos envios.")}</p>{member&&session?.user?.admin&&<a href="/configuracao" className="notice-link">Preparar o correio <ArrowUpRight size={12}/></a>}</div></div>}
            <div className="form-step"><span>01</span><h3>Quem vai receber esse carinho?</h3></div>
            <label className="anonymous-option"><input type="checkbox" checked={draft.anonymous} onChange={e=>update("anonymous",e.target.checked)} disabled={locked}/><span className="switch-track" aria-hidden="true"><span/></span><span><strong>Enviar anonimamente</strong><small>Seu nome e e-mail não aparecem para quem recebe.</small></span></label>
            <div className="field"><label htmlFor="sender">De <span>{draft.anonymous?"uma gentileza sem assinatura":"edite o nome como quer assinar"}</span></label><input id="sender" name="senderName" placeholder="Como você quer assinar?" value={draft.anonymous?"Alguém que te deseja bem":draft.senderName} onChange={e=>update("senderName",e.target.value)} minLength={2} maxLength={80} autoComplete="off" required={!draft.anonymous} disabled={locked||draft.anonymous}/>{draft.anonymous?<p className="field-help">Sua conta corporativa é usada só para autorizar o envio.</p>:member&&<p className="verified-sender"><CheckCheck size={12}/>{session.user?.email}</p>}</div>
            <div className="field recipient-field"><label htmlFor="person-search">Para <span>quem merece um dia mais leve</span></label>{recipient?<div className="selected-person"><span className="person-initials">{recipient.name.split(" ").filter(Boolean).slice(0,2).map(n=>n[0]).join("")}</span><div><strong>{recipient.name}</strong><span>{recipient.email}</span></div><Check size={15} className="person-checked"/><button type="button" disabled={locked} aria-label="Escolher outra pessoa" onClick={()=>{setRecipient(null);setSearch("");setTimeout(()=>searchInput.current?.focus(),0);}}><X size={15}/></button></div>:<div className="recipient-combobox"><div className="person-search"><Search size={17}/><input id="person-search" ref={searchInput} role="combobox" aria-expanded={open&&search.length>=2} aria-controls="people-list" aria-autocomplete="list" aria-activedescendant={open&&active>=0?"person-"+active:undefined} autoComplete="off" placeholder={!member?"Entre para buscar um colega":!session?.directoryReady?"Lista de colaboradores em preparação":"Digite o nome de um colega..."} value={search} onChange={e=>{setSearch(e.target.value);setOpen(true);setActive(-1);}} onFocus={()=>setOpen(true)} onBlur={()=>setTimeout(()=>setOpen(false),120)} onKeyDown={searchKeys} disabled={!member||!session?.directoryReady||locked} maxLength={100}/>{searching&&<LoaderCircle className="spin" size={15}/>}</div>{open&&search.trim().length>=2&&<div className="people-dropdown" id="people-list" role="listbox" aria-label="Colaboradores encontrados">{searching?<p className="people-state">Procurando esse nome...</p>:searchError?<p className="people-state">{searchError}</p>:people.length?people.map((person,i)=><div key={person.email} id={"person-"+i} role="option" aria-selected={active===i} className={"person-option"+(active===i?" highlighted":"")} onMouseDown={e=>e.preventDefault()} onClick={()=>choose(person)}><span className="person-initials">{person.name.split(" ").filter(Boolean).slice(0,2).map(n=>n[0]).join("")}</span><div><strong>{person.name}</strong><span>{person.email}</span></div><ArrowUpRight size={14}/></div>):<p className="people-state">Nenhuma pessoa encontrada. Tente outro nome.</p>}</div>}</div>}<p className="field-help">Selecione o nome e confira o e-mail antes de enviar.</p></div>
            <div className="form-step second-step"><span>02</span><h3>O que seu coração quer dizer?</h3></div>
            <fieldset className="topic-picker" disabled={locked}><legend className="sr-only">Tipo de gentileza</legend>{Object.entries(topics).map(([key,label])=><label key={key} className={draft.category===key?"topic selected":"topic"}><input type="radio" name="category" value={key} checked={draft.category===key} onChange={()=>update("category",key as Topic)}/>{label}</label>)}</fieldset>
            <div className="field message-field"><label htmlFor="message" className="sr-only">Sua mensagem de gentileza</label><textarea id="message" className={draft.color} placeholder={"Obrigada por...\nAdmiro muito o seu jeito de...\nQue bom ter você por perto porque..."} value={draft.message} onChange={e=>update("message",e.target.value)} minLength={5} maxLength={600} required disabled={locked}/><div className="message-bottom"><span><Heart size={12}/> Pequeno no tamanho. Grande no significado.</span><span>{draft.message.length}/600</span></div></div>
            <fieldset className="color-picker" disabled={locked}><legend>Um toque de cor para o seu e-mail</legend><div>{Object.entries(themes).map(([key,theme])=><label key={key} title={theme.label} className={"swatch "+key+(draft.color===key?" selected":"")}><input type="radio" name="color" value={key} checked={draft.color===key} onChange={()=>update("color",key as Theme)}/><span className="sr-only">{theme.label}</span>{draft.color===key&&<Check size={15}/>}</label>)}<span className="theme-label">{themes[draft.color].label}</span></div></fieldset>
            {formError&&<p className="form-error" role="alert">{formError}</p>}
            {uncertain?<button type="button" className="button button-dark send-button" onClick={()=>void verify()} disabled={checking}>{checking?<LoaderCircle size={17} className="spin"/>:<RefreshCw size={17}/>} Verificar este envio</button>:member?<button type="submit" className="button button-orange send-button" disabled={sending||!(draft.anonymous?session.anonymousReady:session.mailReady)||!session.directoryReady}>{sending?<><LoaderCircle className="spin" size={18}/>Enviando carinho...</>:<>Enviar essa gentileza <ArrowUpRight size={19}/></>}</button>:<a className="button button-dark send-button" href={session?.state==="denied"?session.signOut:session?.signIn||"/api/auth/google/start"} target="_top"><LockKeyhole size={16}/>{session?.state==="denied"?"Trocar para conta CRO-MG":"Entrar e preparar meu envio"}<ArrowUpRight size={17}/></a>}
            <p className="delivery-note"><Mail size={13}/> Esta mensagem vai chegar só ao e-mail da pessoa escolhida.</p>
          </form>}
        </div>
        <aside className="mail-preview" aria-labelledby="preview-title"><div className="preview-heading"><div><span className="eyebrow">UM CARINHO COM A SUA CARA</span><h3 id="preview-title">Olha como vai chegar.</h3></div><span className="preview-live"><span/> PRÉVIA</span></div><div className="inbox-preview"><div className="inbox-chrome"><span/><span/><span/><span className="inbox-title">uma pausa boa na caixa de entrada</span></div><div className="email-headers"><span className="email-avatar"><Flower/></span><div><strong>Correio de Gentilezas</strong><span>{draft.anonymous?"ascom@cromg.org.br":session?.user?.email||"seu.email@cromg.org.br"}</span></div><Heart size={16}/></div><div className="subject-preview">{subjectFor(letter)}</div><iframe className="email-frame" title="Prévia do e-mail de gentileza" sandbox="" srcDoc={emailHtml}/></div><button className="expand-preview" onClick={()=>previewDialog.current?.showModal()}><Eye size={15}/> Ver o e-mail inteiro <ArrowUpRight size={14}/></button><p className="preview-caption">A prévia acompanha o que você escreve.<br/>O envio acontece quando você clicar em “Enviar essa gentileza”.</p><div className="privacy-card"><div className="privacy-heart"><Heart size={24} strokeWidth={1.4}/></div><div><strong>{draft.anonymous?"Um gesto sem assinatura.":"Um carinho entre vocês."}</strong><p>{draft.anonymous?"A pessoa recebe sua gentileza sem nome ou e-mail de remetente. A resposta não revela sua identidade.":"A gentileza sai do seu próprio e-mail corporativo, com a assinatura que você escolher."}</p></div></div></aside>
        </div>
      </section>
      <section className="atelier-invitation page-width"><Flower/><div><span className="eyebrow">UM CARINHO PARA LEVAR</span><h2>Gentileza também vira imagem.</h2><p>Escolha uma moldura, escreva sua mensagem e inclua uma foto. Baixe e espalhe por aí.</p></div><a href="/atelie" className="button">Abrir o ateliê <ArrowUpRight size={16}/></a></section><section className="closing page-width"><Flower/><p>Algumas palavras ficam com a gente.<br/><span>Que as suas façam alguém sorrir.</span></p><button onClick={jump} aria-label="Escrever uma gentileza"><ArrowUpRight size={30}/></button></section>
    </main>
    <footer className="site-footer page-width"><a href="#inicio" className="footer-brand">gentileza circula.</a><span>Feito de pessoas. Feito para pessoas.</span><span><Mail size={12}/> Correio de Gentilezas · CRO-MG</span><a href="/privacidade">Privacidade</a></footer>
    <dialog ref={previewDialog} className="email-dialog"><div className="dialog-heading"><div><span className="eyebrow">ASSIM, COM CARINHO</span><h2>Sua gentileza, por e-mail.</h2></div><button onClick={()=>previewDialog.current?.close()} aria-label="Fechar prévia"><X size={20}/></button></div><p className="dialog-address">{recipient?<>Para <strong>{recipient.name}</strong> · {recipient.email}</>:"Prévia ilustrativa. Escolha um destinatário para personalizar."}</p><iframe title="E-mail completo de gentileza" sandbox="" srcDoc={emailHtml}/><p className="dialog-foot">Esta é uma prévia. Nenhum e-mail foi enviado.</p></dialog>
    <dialog ref={howDialog} className="how-dialog"><button className="dialog-close" aria-label="Fechar como funciona" onClick={()=>howDialog.current?.close()}><X size={20}/></button><Flower className="dialog-flower"/><span className="eyebrow">TÃO SIMPLES QUANTO UM OBRIGADO</span><h2>Carinho bom<br/>encontra caminho.</h2><ol><li><span>01</span><div><h3>Entre com seu e-mail CRO-MG.</h3><p>Entre com sua conta Google @cromg.org.br e autorize o envio das gentilezas.</p></div></li><li><span>02</span><div><h3>Encontre a pessoa certa.</h3><p>Digite o nome, selecione na lista e confira o e-mail.</p></div></li><li><span>03</span><div><h3>Escreva e deixe chegar.</h3><p>Escolha uma cor e envie com sua assinatura ou anonimamente. A gentileza chega por e-mail.</p></div></li></ol><button className="button button-orange" onClick={()=>{howDialog.current?.close();jump();}}>Quero mandar o meu carinho <ArrowUpRight size={18}/></button></dialog>
  </>;
}
