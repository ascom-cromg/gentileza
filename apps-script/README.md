# Ativar a entrega pelo Apps Script

O formulário e a lista ficam no backend do site. Visitantes só conseguem buscar destinatários e enviar depois de entrar no ChatGPT com um e-mail do domínio exato `@cromg.org.br`. O Apps Script é um serviço de entrega: ele só aceita pedidos assinados pelo servidor, nunca chamadas diretas do navegador do visitante.

## Configuração na conta da Comunicação

1. Abra https://script.google.com/ com **ascom@cromg.org.br** e crie um projeto chamado **Correio de Gentilezas CRO-MG**.
2. Copie todo o conteúdo de `Code.gs` para **Código.gs**.
3. Execute `prepararCorreio` uma vez. A conta da Comunicação deve autorizar o envio de e-mails solicitado pelo Google. A função não envia mensagens.
4. Em **Configurações do projeto > Propriedades do script**, haverá uma chave chamada `GENTILEZA_SHARED_SECRET`. Ela foi gerada no seu projeto; copie-a apenas para a configuração segura do site, nunca para GitHub ou chat.
5. Se quiser usar o manifesto fornecido, habilite **Mostrar o arquivo de manifesto appsscript.json** nas configurações e copie `appsscript.json`. Ele pede apenas envio de e-mail e identificação da conta executora.
6. Em **Implantar > Nova implantação > App da Web**, escolha **Executar como: Eu (ascom@cromg.org.br)**. Para o servidor conseguir chamar esse endpoint, escolha **Quem pode acessar: Qualquer pessoa**. Essa opção é para a API de entrega, que exige assinatura HMAC; não libera o envio pelo formulário para pessoas de fora do CRO-MG.
7. Copie a URL de implantação terminada em `/exec`. Não use `/dev`.
8. Configure os segredos de produção do site: `APPS_SCRIPT_URL` com essa URL e `APPS_SCRIPT_SECRET` com o mesmo valor de `GENTILEZA_SHARED_SECRET`.
9. Reimplante a versão salva do site para aplicar a configuração. A área `/configuracao` informa quando a conexão está configurada.
10. Faça um envio de teste para um destinatário explicitamente autorizado. A presença dos segredos ainda não comprova a entrega.

Se a política Google Workspace impedir a implantação do endpoint, a TI deve autorizar o projeto; não mude a política de acesso do formulário.

## Identificação e envio anônimo

- O remetente técnico é sempre **ascom@cromg.org.br**.
- No envio identificado, o nome é editável e a resposta vai para o endereço corporativo autenticado de quem escreveu.
- No envio anônimo, o HTML, o texto simples e o campo de resposta não revelam o nome nem o e-mail de quem escreveu. O serviço de entrega recebe a conta autenticada para validar o domínio, mas não a inclui no e-mail do destinatário.
- Não há CC, BCC nem cópia para a Comunicação.
- O Apps Script registra apenas um identificador e o estado do envio, para não repetir o mesmo e-mail. Ele não grava o texto da mensagem nem a identidade do autor nas propriedades de recibo.
- As cotas reais são verificadas com `MailApp.getRemainingDailyQuota()` antes de enviar.

## Testes sem envio

Os testes do repositório usam uma implementação simulada do MailApp. Nenhum e-mail real é enviado na validação automatizada. A autorização do Google e o teste real dependem da implantação acima.

Referências oficiais:
- https://developers.google.com/apps-script/reference/mail/mail-app
- https://developers.google.com/apps-script/guides/web
