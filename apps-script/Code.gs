/**
 * Correio de Gentilezas do CRO-MG.
 * Copie este arquivo para Código.gs e publique como app da Web.
 * O endpoint só aceita pedidos assinados pelo servidor do site.
 */
var GENTILEZA_REMETENTE = 'ascom@cromg.org.br';

function prepararCorreio() {
  if (String(Session.getEffectiveUser().getEmail()).toLowerCase() !== GENTILEZA_REMETENTE) {
    throw new Error('Execute com a conta ascom@cromg.org.br.');
  }
  var props = PropertiesService.getScriptProperties();
  if (!props.getProperty('GENTILEZA_SHARED_SECRET')) {
    props.setProperty('GENTILEZA_SHARED_SECRET', Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, ''));
  }
  return 'Chave criada nas propriedades do script. Configure a mesma chave no segredo APPS_SCRIPT_SECRET do site.';
}

function doGet() {
  return resposta_({ service: 'Correio de Gentilezas CRO-MG', accepts: 'signed POST' });
}

function doPost(e) {
  var lock = null;
  var started = false;
  var props = PropertiesService.getScriptProperties();
  try {
    var raw = e && e.postData && e.postData.contents;
    if (!raw || raw.length > 100000) return resposta_({ ok: false, code: 'INVALID', uncertain: false });
    var envelope = JSON.parse(raw);
    var secret = props.getProperty('GENTILEZA_SHARED_SECRET');
    if (!secret || secret.length < 32 || typeof envelope.payload !== 'string' || typeof envelope.signature !== 'string') {
      return resposta_({ ok: false, code: 'UNAUTHORIZED', uncertain: false });
    }
    var bytes = Utilities.computeHmacSha256Signature(envelope.payload, secret, Utilities.Charset.UTF_8);
    var expected = Utilities.base64EncodeWebSafe(bytes).replace(/=+$/, '');
    if (!igualSeguro_(expected, envelope.signature)) return resposta_({ ok: false, code: 'UNAUTHORIZED', uncertain: false });
    var data = JSON.parse(envelope.payload);
    if (data.version !== 1 || !/^[0-9a-f-]{36}$/i.test(data.id || '') || typeof data.timestamp !== 'number' || Math.abs(Date.now() - data.timestamp) > 300000) {
      return resposta_({ ok: false, code: 'EXPIRED', uncertain: false });
    }
    if (!emailCro_(data.actorEmail) || !emailCro_(data.recipientEmail) || typeof data.anonymous !== 'boolean' || typeof data.subject !== 'string' || /[\r\n]/.test(data.subject) || data.subject.length > 200 || typeof data.text !== 'string' || data.text.length > 5000 || typeof data.html !== 'string' || data.html.length > 80000) {
      return resposta_({ ok: false, code: 'INVALID', uncertain: false });
    }
    if (String(Session.getEffectiveUser().getEmail()).toLowerCase() !== GENTILEZA_REMETENTE) {
      return resposta_({ ok: false, code: 'WRONG_MAILBOX', uncertain: false });
    }
    lock = LockService.getScriptLock();
    if (!lock.tryLock(10000)) return resposta_({ ok: false, code: 'BUSY', uncertain: false });
    var key = 'delivery.' + data.id;
    var previous = props.getProperty(key);
    if (previous) {
      var receipt = JSON.parse(previous);
      if (receipt.status === 'sent') return resposta_({ ok: true, id: 'apps-script:' + data.id });
      return resposta_({ ok: false, code: 'PENDING', uncertain: true });
    }
    if (MailApp.getRemainingDailyQuota() < 1) return resposta_({ ok: false, code: 'QUOTA', uncertain: false });
    limparRecibos_(props);
    props.setProperty(key, JSON.stringify({ status: 'pending', time: Date.now() }));
    var options = {
      to: data.recipientEmail,
      subject: data.subject,
      body: data.text,
      htmlBody: data.html,
      name: 'Correio de Gentilezas · CRO-MG',
      replyTo: data.anonymous ? GENTILEZA_REMETENTE : data.actorEmail
    };
    started = true;
    MailApp.sendEmail(options);
    props.setProperty(key, JSON.stringify({ status: 'sent', time: Date.now() }));
    return resposta_({ ok: true, id: 'apps-script:' + data.id });
  } catch (error) {
    return resposta_({ ok: false, code: 'DELIVERY_ERROR', uncertain: started });
  } finally {
    if (lock && lock.hasLock()) lock.releaseLock();
  }
}

function emailCro_(email) {
  return typeof email === 'string' && /^[a-z0-9.!#$%&'*+/=?^_{|}~-]+@cromg\.org\.br$/i.test(email) && !email.split('@')[0].includes('..');
}
function igualSeguro_(a, b) {
  if (a.length !== b.length) return false;
  var diff = 0;
  for (var i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}
function limparRecibos_(props) {
  var all = props.getProperties();
  var oldest = Date.now() - 172800000;
  Object.keys(all).forEach(function (key) {
    if (key.indexOf('delivery.') !== 0) return;
    try { if (JSON.parse(all[key]).time < oldest) props.deleteProperty(key); } catch (ignore) {}
  });
}
function resposta_(value) {
  return ContentService.createTextOutput(JSON.stringify(value)).setMimeType(ContentService.MimeType.JSON);
}
