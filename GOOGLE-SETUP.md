# Ativar o login Google e o remetente individual

A implementação está pronta. A ativação depende de um cliente OAuth do Google Cloud da organização CRO-MG. Colaboradores não precisam de conta ChatGPT.

## Google Cloud

1. Abra https://console.cloud.google.com/ com a conta autorizada da TI / Comunicação e selecione ou crie um projeto vinculado à organização Google Workspace cromg.org.br.
2. Ative a **Gmail API**.
3. Em **Google Auth Platform**, configure o nome **Correio de Gentilezas CRO-MG**, o contato de suporte e o público **Interno**, na organização CRO-MG. Caso a opção não apareça, a TI deve verificar se o projeto pertence à organização correta.
4. Cadastre os escopos `openid`, `email`, `profile` e `https://www.googleapis.com/auth/gmail.send`. Este último permite envio; o app não solicita leitura, consulta ou exclusão de e-mails. A TI pode precisar liberar o cliente OAuth nas regras do Workspace.
5. Crie um cliente OAuth do tipo **Aplicativo da Web**.

Página inicial:
```
https://gentileza-circula-cromg.ascom946966.chatgpt.site
```
Política de privacidade:
```
https://gentileza-circula-cromg.ascom946966.chatgpt.site/privacidade
```
URI de redirecionamento autorizado — copie exatamente, sem barra no final:
```
https://gentileza-circula-cromg.ascom946966.chatgpt.site/api/auth/google/callback
```

Não use a URL do Apps Script nem `/callback` como URI OAuth. O fluxo é pelo servidor e não exige uma origem JavaScript.

## Segredos de produção na hospedagem

| Chave | Valor |
| --- | --- |
| `GOOGLE_CLIENT_ID` | ID do cliente OAuth criado acima |
| `GOOGLE_CLIENT_SECRET` | Segredo do mesmo cliente |
| `GOOGLE_TOKEN_KEY` | Chave AES de 32 bytes aleatórios em base64url sem padding, provisionada nesta implantação |

Cadastre as credenciais como segredos nas variáveis de ambiente de produção do site e reimplante a versão salva. Não coloque credenciais no repositório, navegador, planilhas ou chat. Não substitua a chave AES existente: ela protege os tokens das sessões.

## Remetentes

- Identificado: Gmail API `users/me`, com o token do colaborador e seu e-mail autenticado no From. A assinatura continua editável.
- Anônimo: conta **ascom@cromg.org.br**, via Apps Script da Comunicação. O token do autor não é usado para enviar a mensagem anônima.

O envio identificado independe do Apps Script. Para o anônimo, mantenha `APPS_SCRIPT_URL` e configure `APPS_SCRIPT_SECRET` com o valor de `GENTILEZA_SHARED_SECRET` nas propriedades do script. A implantação informada já foi cadastrada no ambiente:
```
https://script.google.com/macros/s/AKfycby23kSR8SKyBQEXZ12qVemcR4EugDSF0CI2-vfYFIC1VNhLHvtpCXKr9gkHeyjgprod/exec
```

O Apps Script deve executar como ascom@cromg.org.br e aceitar chamadas do servidor sem login Google. O endpoint exige assinatura HMAC; a página continua exigindo login Google corporativo. Veja [apps-script/README.md](apps-script/README.md).

## Conferência antes da divulgação

Entre com uma conta @cromg.org.br ativa na lista e autorize o envio. Confira o endereço exibido e faça um envio identificado para um destinatário de teste autorizado; verifique o remetente. Depois faça um envio anônimo: não deve revelar nome ou e-mail do autor, inclusive no Reply-To. Contas externas, inativas e visitantes sem login não podem acessar a busca nem enviar.

## Sessões e revogação

A sessão dura até sete dias e usa cookie Secure, HttpOnly e SameSite=Lax. O navegador recebe apenas um identificador opaco. Access e refresh tokens ficam criptografados no servidor com AES-GCM. O Google pode solicitar consentimento novamente conforme as permissões e regras da organização. Se não devolver refresh token, será necessário novo login quando o access token expirar. Sair invalida a sessão local. A autorização também pode ser revogada nas permissões da conta Google.

Os testes automatizados usam serviços simulados e não enviam e-mails. O texto das gentilezas não é arquivado no banco do site; os provedores de e-mail processam a entrega. Mensagens identificadas podem aparecer nos enviados da conta do autor.

Referências oficiais:
- https://developers.google.com/identity/protocols/oauth2/web-server
- https://developers.google.com/identity/openid-connect/openid-connect
- https://developers.google.com/workspace/gmail/api/auth/scopes
