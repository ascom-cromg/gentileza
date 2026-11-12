# Correio de Gentilezas · CRO-MG

Gentilezas individuais por e-mail, com lista corporativa, nome editável e opção anônima. A apresentação é pública; a lista e os envios exigem login Google com conta @cromg.org.br ativa no cadastro. Não é necessária conta ChatGPT para colaboradores.

## Login e remetente

**Entrar com Google** reúne login e consentimento `gmail.send`. Identificado: o servidor usa Gmail API `users/me`, com token do colaborador e seu e-mail verificado no From. Anônimo: usa exclusivamente ascom@cromg.org.br via Apps Script ou Gmail da Comunicação. Sem credenciais configuradas, login e envio ficam bloqueados. Não há autenticação por e-mail digitado nem fallback pelos headers de login da plataforma.

## Ativação

Siga [GOOGLE-SETUP.md](GOOGLE-SETUP.md), com callback, escopos e segredos de produção. O [Apps Script](apps-script/README.md) é mantido para o envio anônimo.

## Segurança e dados

OAuth Authorization Code com PKCE, state de uso único, nonce e verificação de assinatura do ID token via JWKS Google (jose). O servidor valida domínio Workspace, e-mail verificado, audiência e conta ativa. O parâmetro `hd` no link de login sozinho não concede acesso.

Cookies de sessão opacos Secure/HttpOnly/SameSite=Lax. Tokens criptografados com AES-GCM, chave somente no ambiente de produção. Sessões expiram em sete dias; logout invalida o registro. Consulte `/privacidade`.

A lista importada permanece no D1 e não vai ao GitHub. Só contas ativas são pesquisáveis. Mensagens não são publicadas nem arquivadas como mural; rotas antigas retornam 410. Recibos técnicos e idempotência evitam reenvio automático em caso de confirmação incerta.

## Desenvolvimento e validação

```sh
npm ci
node scripts/test-correio.mjs
node scripts/test-google.mjs
node --test tests/apps-script.test.mjs
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Testes de login, criptografia e envio usam dados fictícios e serviços simulados, sem e-mails reais. A validação real depende da configuração do cliente Google e de um destinatário de teste autorizado. Nunca versionar credenciais ou a lista corporativa.
