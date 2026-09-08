const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);

let WebSocket;
let wss = null;
try {
  WebSocket = require('ws');
  wss = new WebSocket.Server({ server });
} catch (e) {
  console.log('Module "ws" not installed. Chat will fall back to HTTP polling.');
}

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'chat-data.json');
const ADMIN_KEY = process.env.ADMIN_KEY || '240625';
const MAX_MESSAGES = 200;
const PROFANITY_MUTE_MS = 2 * 60 * 1000;

const BAD_WORDS = [
  'puta', 'puto', 'mierda', 'mierdas', 'cabron', 'cabrona', 'imbecil',
  'idiota', 'pendejo', 'culero', 'maricon', 'gonorrea', 'coño', 'joder',
  'huevon', 'baboso'
];

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

let messages = [];
const clientStats = new Map();
const clientSessions = new Map();
const activePollClients = new Set();
const typingUsers = new Map();

function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
    .trim();
}

function sanitizeRankLabel(value) {
  return String(value || '').replace(/[\r\n\t]+/g, ' ').trim().slice(0, 24);
}

function sanitizeRankColor(value) {
  const color = String(value || '').trim();
  return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(color) ? color : '#00f2fe';
}

function normalizeForModeration(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function containsBadWords(text) {
  const normalized = normalizeForModeration(text);
  return BAD_WORDS.some((word) => new RegExp(`(^|[^a-z0-9])${word}($|[^a-z0-9])`).test(normalized));
}

function getClientKey(clientId, ip) {
  const cleanClientId = String(clientId || '').trim();
  if (cleanClientId) return `client:${cleanClientId}`;
  const cleanIp = String(ip || '').trim();
  if (cleanIp) return `ip:${cleanIp}`;
  return 'ip:unknown';
}

function getClientState(clientId, ip) {
  const key = getClientKey(clientId, ip);
  let stat = clientStats.get(key);
  if (!stat) {
    stat = { lastMsgTime: 0, mutedUntil: 0 };
    clientStats.set(key, stat);
  }
  return { key, stat };
}

function getClientSession(clientId, ip, user = 'Usuario') {
  const key = getClientKey(clientId, ip);
  let session = clientSessions.get(key);
  if (!session) {
    session = {
      key,
      clientId: String(clientId || key),
      ip: String(ip || ''),
      user: String(user || 'Usuario').slice(0, 24) || 'Usuario',
      lastMsgTime: 0,
      mutedUntil: 0
    };
    clientSessions.set(key, session);
  }
  if (clientId) session.clientId = String(clientId);
  if (ip) session.ip = String(ip);
  if (user) session.user = String(user).slice(0, 24) || session.user;
  return session;
}

function muteSession(session, durationMs = PROFANITY_MUTE_MS) {
  if (!session) return 0;
  const mutedUntil = Date.now() + durationMs;
  session.mutedUntil = mutedUntil;
  const stat = clientStats.get(session.key);
  if (stat) stat.mutedUntil = mutedUntil;
  return mutedUntil;
}

function checkMuteAndRateLimit(clientId, ip) {
  const { stat } = getClientState(clientId, ip);
  const now = Date.now();

  if (stat.mutedUntil && now < stat.mutedUntil) {
    const remainingSecs = Math.ceil((stat.mutedUntil - now) / 1000);
    return { error: `Estás silenciado temporalmente (${remainingSecs}s restantes).`, mutedUntil: stat.mutedUntil };
  }

  if (now - stat.lastMsgTime < 1200) {
    return { error: 'Escribes demasiado rápido. Espera un segundo antes de enviar otro mensaje.' };
  }

  stat.lastMsgTime = now;
  return { ok: true };
}

function ensureMessageShape(message) {
  if (!message || typeof message !== 'object') return message;
  if (!Array.isArray(message.seenBy)) message.seenBy = [];
  if (typeof message.timestamp !== 'number') message.timestamp = Date.now();
  if (typeof message.clientId !== 'string') message.clientId = '';
  return message;
}

function normalizeLoadedMessages(list) {
  if (!Array.isArray(list)) return [];
  return list.map((item) => ensureMessageShape(item)).filter(Boolean);
}

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    messages = normalizeLoadedMessages(JSON.parse(raw));
  }
} catch (e) {
  console.warn('No se pudo cargar el historial de chat:', e.message);
  messages = [];
}

function saveMessages() {
  try {
    if (messages.length > MAX_MESSAGES) {
      messages = messages.slice(messages.length - MAX_MESSAGES);
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(messages, null, 2), 'utf8');
  } catch (e) {
    console.warn('Error al guardar mensajes:', e.message);
  }
}

function broadcastWS(data, exceptWs = null) {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState !== WebSocket.OPEN) return;
    if (exceptWs && client === exceptWs) return;
    client.send(payload);
  });
}

function getOnlineCount() {
  const wsCount = wss ? wss.clients.size : 0;
  return Math.max(1, wsCount + activePollClients.size);
}

function cleanTypingUsers() {
  const now = Date.now();
  for (const [user, timestamp] of typingUsers.entries()) {
    if (now - timestamp > 3000) typingUsers.delete(user);
  }
}

function markMessagesSeen(clientId, uptoTimestamp) {
  if (!clientId || !uptoTimestamp) return [];
  const updated = [];
  messages.forEach((msg) => {
    if (!msg || msg.isSystem) return;
    if (msg.timestamp > uptoTimestamp) return;
    if (msg.clientId && msg.clientId === clientId) return;
    ensureMessageShape(msg);
    if (!msg.seenBy.includes(clientId)) {
      msg.seenBy.push(clientId);
      updated.push(msg.id);
    }
  });
  if (updated.length) {
    saveMessages();
    broadcastWS({ type: 'read_receipt', clientId, messageIds: updated, uptoTimestamp });
  }
  return updated;
}

function markMessageSeenByMessageId(clientId, messageId) {
  if (!clientId || !messageId) return false;
  const msg = messages.find((item) => item && item.id === messageId);
  if (!msg) return false;
  if (msg.clientId && msg.clientId === clientId) return false;
  ensureMessageShape(msg);
  if (msg.seenBy.includes(clientId)) return false;
  msg.seenBy.push(clientId);
  saveMessages();
  broadcastWS({ type: 'read_receipt', clientId, messageIds: [messageId], uptoTimestamp: msg.timestamp });
  return true;
}

function createMessage({ user, text, clientId = '', uid = '', email = '', photoURL = '', isSystem = false, isAdmin = false, rankLabel = '', rankColor = '#00f2fe' }) {
  const now = Date.now();
  return {
    id: 'msg_' + now + '_' + Math.random().toString(36).slice(2, 7),
    user: sanitizeText(user).slice(0, 24) || 'Usuario',
    text: sanitizeText(text),
    timestamp: now,
    isSystem: Boolean(isSystem),
    isAdmin: Boolean(isAdmin),
    uid: String(uid || ''),
    email: String(email || ''),
    photoURL: String(photoURL || ''),
    rankLabel: sanitizeRankLabel(rankLabel),
    rankColor: sanitizeRankColor(rankColor),
    clientId: String(clientId || ''),
    seenBy: []
  };
}

function sendMessageFromClient({ user, text, clientId, ip, uid = '', email = '', photoURL = '', isSystem = false, isAdmin = false, rankLabel = '', rankColor = '#00f2fe' }) {
  const session = getClientSession(clientId, ip, user);
  const moderation = checkMuteAndRateLimit(clientId, ip);
  if (moderation.error) {
    return { error: moderation.error, mutedUntil: moderation.mutedUntil || session.mutedUntil || 0 };
  }

  const cleanText = sanitizeText(text);
  if (!cleanText) {
    return { error: 'El mensaje no puede estar vacío.' };
  }
  if (cleanText.length > 400) {
    return { error: 'El mensaje supera el límite máximo de 400 caracteres.' };
  }

  if (!isSystem && containsBadWords(cleanText)) {
    const mutedUntil = muteSession(session, PROFANITY_MUTE_MS);
    return {
      error: 'No se permiten malas palabras. Quedaste silenciado por 2 minutos.',
      mutedUntil
    };
  }

  session.user = sanitizeText(user).slice(0, 24) || session.user;
  const newMsg = createMessage({
    user: session.user,
    text: cleanText,
    clientId: session.clientId,
    uid,
    email,
    photoURL,
    isSystem,
    isAdmin,
    rankLabel,
    rankColor
  });

  messages.push(newMsg);
  saveMessages();
  broadcastWS({ type: 'new_message', message: newMsg });
  return { success: true, message: newMsg };
}

app.get('/api/chat/init', (req, res) => {
  res.json({
    type: 'init',
    history: messages,
    onlineCount: getOnlineCount()
  });
});

app.get('/api/chat/poll', (req, res) => {
  const clientId = req.query.clientId || req.ip;
  activePollClients.add(String(clientId || req.ip || 'poll'));
  cleanTypingUsers();

  const since = parseInt(req.query.since, 10) || 0;
  const newMsgs = messages.filter((m) => m.timestamp > since);

  res.json({
    onlineCount: getOnlineCount(),
    messages: newMsgs,
    typing: Array.from(typingUsers.keys())
  });
});

app.post('/api/chat/send', (req, res) => {
  const { user, text, clientId, uid, email, photoURL, isSystem, isAdmin, rankLabel, rankColor } = req.body || {};
  const result = sendMessageFromClient({
    user,
    text,
    clientId: clientId || req.ip,
    ip: req.ip || '127.0.0.1',
    uid,
    email,
    photoURL,
    isSystem: Boolean(isSystem),
    isAdmin: Boolean(isAdmin),
    rankLabel,
    rankColor
  });

  if (result.error) {
    return res.status(result.mutedUntil ? 403 : 429).json(result);
  }

  res.json(result);
});

app.post('/api/chat/typing', (req, res) => {
  const { user, isTyping, clientId } = req.body || {};
  const cleanUser = sanitizeText(user).slice(0, 24);
  if (!cleanUser) return res.json({ ok: true });

  if (isTyping) typingUsers.set(cleanUser, Date.now());
  else typingUsers.delete(cleanUser);

  broadcastWS({
    type: 'typing',
    user: cleanUser,
    isTyping: Boolean(isTyping),
    clientId: String(clientId || '')
  });

  res.json({ ok: true });
});

app.post('/api/chat/seen', (req, res) => {
  const { clientId, uptoTimestamp, messageId } = req.body || {};
  const cleanClientId = String(clientId || '').trim();
  if (!cleanClientId) return res.json({ ok: true });

  if (messageId) {
    markMessageSeenByMessageId(cleanClientId, String(messageId));
    return res.json({ ok: true });
  }

  const ts = Number(uptoTimestamp) || 0;
  const updated = markMessagesSeen(cleanClientId, ts);
  res.json({ ok: true, updated });
});

app.post('/api/chat/admin', (req, res) => {
  const { adminKey, action, msgId, text, targetUser, seconds } = req.body || {};

  if (adminKey !== ADMIN_KEY) {
    return res.status(401).json({ error: 'Clave de administración incorrecta.' });
  }

  if (action === 'verify') {
    return res.json({ success: true, message: 'Clave de administración correcta.' });
  }

  if (action === 'clear_chat') {
    messages = [];
    saveMessages();
    broadcastWS({ type: 'clear_chat' });
    const sysMsg = createMessage({
      user: 'Sistema Admin',
      text: 'El historial de chat ha sido vaciado por el administrador.',
      isSystem: true
    });
    messages.push(sysMsg);
    saveMessages();
    broadcastWS({ type: 'new_message', message: sysMsg });
    return res.json({ success: true, message: 'Historial de chat vaciado correctamente.' });
  }

  if (action === 'delete_message') {
    messages = messages.filter((m) => m.id !== msgId);
    saveMessages();
    broadcastWS({ type: 'delete_message', msgId });
    return res.json({ success: true, message: 'Mensaje eliminado correctamente.' });
  }

  if (action === 'broadcast') {
    const cleanText = sanitizeText(text);
    if (!cleanText) return res.status(400).json({ error: 'El mensaje del anuncio no puede estar vacío.' });

    const systemMsg = createMessage({
      user: 'ANUNCIO OFICIAL',
      text: cleanText,
      isSystem: true,
      isAdmin: true
    });
    messages.push(systemMsg);
    saveMessages();
    broadcastWS({ type: 'new_message', message: systemMsg });
    return res.json({ success: true, message: 'Anuncio publicado correctamente.' });
  }

  if (action === 'mute_user') {
    const cleanTarget = sanitizeText(targetUser).toLowerCase();
    const durationMs = (parseInt(seconds, 10) || 60) * 1000;
    let mutedCount = 0;

    for (const session of clientSessions.values()) {
      if (!cleanTarget || (session.user || '').toLowerCase() === cleanTarget) {
        muteSession(session, durationMs);
        mutedCount++;
      }
    }

    return res.json({
      success: true,
      message: `Instruccion de silencio enviada para ${cleanTarget || 'todos los usuarios'} (${mutedCount} sesiones).`
    });
  }

  res.status(400).json({ error: 'Acción no válida.' });
});

if (wss) {
  wss.on('connection', (ws, req) => {
    const url = new URL(req.url, 'http://localhost');
    const clientId = url.searchParams.get('clientId') || `ws_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    const session = getClientSession(clientId, req.socket.remoteAddress || req.ip || '127.0.0.1');

    ws._clientId = clientId;

    ws.send(JSON.stringify({
      type: 'init',
      clientId,
      history: messages,
      onlineCount: getOnlineCount()
    }));

    broadcastWS({ type: 'online_count', count: getOnlineCount() });

    ws.on('message', (rawMessage) => {
      try {
        const data = JSON.parse(rawMessage.toString());

        if (data.type === 'join') {
          const user = sanitizeText(data.user).slice(0, 24) || 'Usuario';
          session.user = user;
          getClientSession(clientId, req.socket.remoteAddress || req.ip || '127.0.0.1', user);
          broadcastWS({ type: 'online_count', count: getOnlineCount() });
          return;
        }

        if (data.type === 'typing') {
          const user = sanitizeText(data.user).slice(0, 24) || session.user || 'Usuario';
          if (data.isTyping) typingUsers.set(user, Date.now());
          else typingUsers.delete(user);

          broadcastWS({
            type: 'typing',
            user,
            isTyping: Boolean(data.isTyping),
            clientId
          }, ws);
          return;
        }

        if (data.type === 'seen') {
          if (data.messageId) {
            markMessageSeenByMessageId(clientId, String(data.messageId));
            return;
          }
          const uptoTimestamp = Number(data.uptoTimestamp) || 0;
          markMessagesSeen(clientId, uptoTimestamp);
          return;
        }

        if (data.type === 'message') {
          const result = sendMessageFromClient({
            user: data.user || session.user,
            text: data.text,
            clientId,
            ip: req.socket.remoteAddress || req.ip || '127.0.0.1',
            uid: data.uid,
            email: data.email,
            photoURL: data.photoURL,
            isSystem: Boolean(data.isSystem),
            isAdmin: Boolean(data.isAdmin),
            rankLabel: data.rankLabel,
            rankColor: data.rankColor
          });

          if (result.error) {
            ws.send(JSON.stringify({
              type: 'error',
              message: result.error,
              mutedUntil: result.mutedUntil || 0
            }));
          }
          return;
        }

        if (data.type === 'admin_action') {
          const key = data.adminKey;
          if (key !== ADMIN_KEY) {
            ws.send(JSON.stringify({ type: 'error', message: 'Clave de administración incorrecta.' }));
            return;
          }

          if (data.action === 'clear_chat') {
            messages = [];
            saveMessages();
            broadcastWS({ type: 'clear_chat' });
            const sysMsg = createMessage({
              user: 'Sistema Admin',
              text: 'El historial de chat ha sido vaciado.',
              isSystem: true
            });
            messages.push(sysMsg);
            saveMessages();
            broadcastWS({ type: 'new_message', message: sysMsg });
          } else if (data.action === 'delete_message') {
            messages = messages.filter((m) => m.id !== data.msgId);
            saveMessages();
            broadcastWS({ type: 'delete_message', msgId: data.msgId });
          } else if (data.action === 'broadcast') {
            const cleanText = sanitizeText(data.text);
            if (cleanText) {
              const systemMsg = createMessage({
                user: 'ANUNCIO OFICIAL',
                text: cleanText,
                isSystem: true,
                isAdmin: true
              });
              messages.push(systemMsg);
              saveMessages();
              broadcastWS({ type: 'new_message', message: systemMsg });
            }
          } else if (data.action === 'mute_user') {
            const cleanTarget = sanitizeText(data.targetUser).toLowerCase();
            const durationMs = (parseInt(data.seconds, 10) || 60) * 1000;
            for (const s of clientSessions.values()) {
              if (!cleanTarget || (s.user || '').toLowerCase() === cleanTarget) {
                muteSession(s, durationMs);
              }
            }
          }
        }
      } catch (e) {
        console.error('Error procesando mensaje websocket:', e.message);
      }
    });

    ws.on('close', () => {
      cleanTypingUsers();
      broadcastWS({ type: 'online_count', count: getOnlineCount() });
    });
  });
}

server.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
