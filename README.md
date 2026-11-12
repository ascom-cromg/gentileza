# Gentileza circula — Correio de Gentilezas do CRO-MG

Página publicada: https://gentileza-circula-cromg.ascom946966.chatgpt.site/

Aplicação de mensagens individuais de gentileza por e-mail. O formulário permite escolher um destinatário pelo nome e endereço, editar a assinatura, escolher uma cor e enviar com identificação ou anonimamente. A prévia acompanha a edição. As mensagens não são publicadas no site.

## Restrição de acesso

O envio e a busca de destinatários exigem identidade autenticada da plataforma com o domínio exato `@cromg.org.br`. Na publicação atual, o login usa uma conta do ChatGPT cadastrada com o e-mail corporativo. Informar um e-mail em um campo não libera o acesso. Todas as rotas verificam a identidade no servidor; o modo anônimo não remove essa exigência.

A área `/configuracao` é exclusiva de `ascom@cromg.org.br`. O nome exibido na assinatura é editável, mas o e-mail de identificação e resposta vem da conta autenticada. No modo anônimo, esse e-mail e o nome não entram no HTML, no texto simples nem nos cabeçalhos de resposta enviados ao destinatário.

## Diretório interno

O diretório é mantido no D1, fora do código-fonte e dos arquivos públicos. A busca é liberada apenas para contas corporativas autenticadas. Contas suspensas ou inativas não aparecem na seleção.

A importação aceita `Nome,E-mail` e, opcionalmente, `Ativo`, ou a exportação do Google com `First Name,Last Name,Email Address,Status`. Datas de último acesso não são importadas. Nomes, e-mails, duplicações e status são validados antes de atualizar a lista em uma transação.

Não publique o CSV dos colaboradores no GitHub. Atualize a lista pela área da Comunicação. Há suporte a uma importação técnica temporária, vinculada ao hash de um único arquivo autorizado e com prazo de expiração; o recibo impede reaplicar esse arquivo sobre alterações posteriores. A capacidade temporária é removida após a importação.

## Entrega de e-mails

O remetente é `ascom@cromg.org.br`. O caminho recomendado de configuração está em **[apps-script/README.md](apps-script/README.md)**, com o código completo em **[apps-script/Code.gs](apps-script/Code.gs)**. Ele usa MailApp, verificação de assinatura HMAC, validação dos domínios e proteção contra envios duplicados.

Após implantar o Apps Script pela conta da Comunicação, configure os segredos `APPS_SCRIPT_URL` e `APPS_SCRIPT_SECRET` na hospedagem e reimplante a versão salva. Nunca grave o segredo no repositório nem o envie no chat. A autorização Google e um envio real precisam ser validados pela conta responsável.

Também há suporte ao transporte Gmail API por `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET` e `GMAIL_REFRESH_TOKEN`. O Apps Script tem prioridade quando configurado.

O envio só é habilitado quando o diretório e um transporte estão configurados. A simples presença dos segredos não comprova a autorização nem a entrega de um e-mail real.

## Dados e privacidade

O corpo da mensagem não é armazenado no D1. Os registros de entrega contêm apenas identificador, hash do autor e do pedido, destinatário, estado e recibo técnico. O rascunho e o identificador temporário ficam na aba do navegador. Reenvios de pedidos confirmados retornam o recibo existente; resultados incertos não são repetidos automaticamente.

As antigas rotas do mural e de reações retornam 410. Dados antigos são preservados sem acesso público ou novas gravações.

## Desenvolvimento e testes

Este projeto usa Vinext/React, Cloudflare Workers e D1. A hospedagem atual fornece autenticação e cabeçalhos de identidade confiáveis. Uma hospedagem diferente precisa de integração equivalente de autenticação; o projeto não é um site estático para GitHub Pages.

Use os helpers de Sites para instalação, preview, build e publicação. O manifesto está em `.openai/hosting.json`, e as migrações versionadas em `drizzle/`.

Verificações:

```sh
node scripts/test-correio.mjs
node --test tests/apps-script.test.mjs
node node_modules/typescript/bin/tsc --noEmit
```

Os testes usam SQLite em memória e transporte simulado. Cobrem domínio exato, destinatário cadastrado, assinatura editável, anonimato, importação, isolamento de recibos, alterações de payload, origem, repetição de pedidos e falha de confirmação. Nenhum e-mail real é enviado pelos testes.
