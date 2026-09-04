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
  console.log('Módulo "ws" no instalado. El chat funcionará con el sistema de transporte HTTP fallback integrado en server.js.');
}

const PORT = process.env.PORT || 3000;
const DATA_FILE = path.join(__dirname, 'chat-data.json');
const ADMIN_KEY = process.env.ADMIN_KEY || '240625';

app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

// Historial persistente de mensajes
let messages = [];
const MAX_MESSAGES = 100;

try {
  if (fs.existsSync(DATA_FILE)) {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    messages = JSON.parse(raw);
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

// Control anti-spam por IP/identificador
const ipStats = new Map();

function checkMuteAndRateLimit(ip) {
  const now = Date.now();
  let stat = ipStats.get(ip);
  if (!stat) {
    stat = { lastMsgTime: 0, isMuted: false, mutedUntil: 0 };
    ipStats.set(ip, stat);
  }

  if (stat.isMuted && now < stat.mutedUntil) {
    const remainingSecs = Math.ceil((stat.mutedUntil - now) / 1000);
    return { error: `Estás silenciado temporalmente (${remainingSecs}s restantes).` };
  } else if (stat.isMuted && now >= stat.mutedUntil) {
    stat.isMuted = false;
  }

  if (now - stat.lastMsgTime < 1200) {
    return { error: 'Escribes demasiado rápido. Espera un segundo antes de enviar otro mensaje.' };
  }

  stat.lastMsgTime = now;
  return { ok: true };
}

// Contadores y eventos en tiempo real
let activePollClients = new Set();
let typingUsers = new Map();

function getOnlineCount() {
  const wsCount = wss ? wss.clients.size : 0;
  const pollCount = activePollClients.size;
  return Math.max(1, wsCount + pollCount);
}

function broadcastWS(data) {
  if (!wss) return;
  const payload = JSON.stringify(data);
  wss.clients.forEach((client) => {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  });
}

// Endpoints HTTP REST & Polling para el chat (para máxima compatibilidad sin dependencias externas)
app.get('/api/chat/init', (req, res) => {
  res.json({
    type: 'init',
    history: messages,
    onlineCount: getOnlineCount()
  });
});

app.get('/api/chat/poll', (req, res) => {
  const clientId = req.query.clientId || req.ip;
  activePollClients.add(clientId);

  const since = parseInt(req.query.since) || 0;
  const newMsgs = messages.filter(m => m.timestamp > since);

  // Limpiar typing expirados (> 3s)
  const now = Date.now();
  for (const [u, t] of typingUsers.entries()) {
    if (now - t > 3000) typingUsers.delete(u);
  }

  res.json({
    onlineCount: getOnlineCount(),
    messages: newMsgs,
    typing: Array.from(typingUsers.keys())
  });
});

app.post('/api/chat/send', (req, res) => {
  const clientIp = req.ip || '127.0.0.1';
  const limitCheck = checkMuteAndRateLimit(clientIp);
  if (limitCheck.error) {
    return res.status(429).json({ error: limitCheck.error });
  }

  const { user, text } = req.body;
  const cleanText = sanitizeText(text);

  if (!cleanText) {
    return res.status(400).json({ error: 'El mensaje no puede estar vacío.' });
  }
  if (cleanText.length > 400) {
    return res.status(400).json({ error: 'El mensaje supera el límite máximo de 400 caracteres.' });
  }

  const cleanUser = sanitizeText(user).slice(0, 24) || 'Invitado';

  const newMsg = {
    id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
    user: cleanUser,
    text: cleanText,
    timestamp: Date.now(),
    isSystem: false,
    isAdmin: false
  };

  messages.push(newMsg);
  saveMessages();

  broadcastWS({ type: 'new_message', message: newMsg });

  res.json({ success: true, message: newMsg });
});

app.post('/api/chat/typing', (req, res) => {
  const { user, isTyping } = req.body;
  const cleanUser = sanitizeText(user).slice(0, 24);
  if (!cleanUser) return res.json({ ok: true });

  if (isTyping) {
    typingUsers.set(cleanUser, Date.now());
  } else {
    typingUsers.delete(cleanUser);
  }

  broadcastWS({
    type: 'typing',
    user: cleanUser,
    isTyping: Boolean(isTyping)
  });

  res.json({ ok: true });
});

app.post('/api/chat/admin', (req, res) => {
  const { adminKey, action, msgId, text, targetUser, seconds } = req.body;

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
    const sysMsg = {
      id: 'sys_' + Date.now(),
      user: 'Sistema Admin',
      text: '🛡️ El historial de chat ha sido vaciado por el administrador.',
      timestamp: Date.now(),
      isSystem: true
    };
    messages.push(sysMsg);
    saveMessages();
    broadcastWS({ type: 'new_message', message: sysMsg });
    return res.json({ success: true, message: 'Historial de chat vaciado correctamente.' });
  }

  if (action === 'delete_message') {
    messages = messages.filter(m => m.id !== msgId);
    saveMessages();
    broadcastWS({ type: 'delete_message', msgId });
    return res.json({ success: true, message: 'Mensaje eliminado correctamente.' });
  }

  if (action === 'broadcast') {
    const cleanText = sanitizeText(text);
    if (!cleanText) return res.status(400).json({ error: 'El mensaje del anuncio no puede estar vacío.' });

    const systemMsg = {
      id: 'sys_' + Date.now(),
      user: '⚡ ANUNCIO OFICIAL',
      text: cleanText,
      timestamp: Date.now(),
      isSystem: true,
      isAdmin: true
    };
    messages.push(systemMsg);
    saveMessages();
    broadcastWS({ type: 'new_message', message: systemMsg });
    return res.json({ success: true, message: 'Anuncio publicado correctamente.' });
  }

  if (action === 'mute_user') {
    const cleanTarget = sanitizeText(targetUser);
    const durationMs = (parseInt(seconds) || 60) * 1000;

    for (const [ip, stat] of ipStats.entries()) {
      stat.isMuted = true;
      stat.mutedUntil = Date.now() + durationMs;
    }

    return res.json({ success: true, message: `Instrucción de silencio enviada para el usuario ${cleanTarget}.` });
  }

  res.status(400).json({ error: 'Acción no válida.' });
});

// Lógica WebSocket nativa si 'ws' está disponible
if (wss) {
  wss.on('connection', (ws) => {
    const socketState = {
      lastMsgTime: 0,
      userName: 'Invitado',
      isMuted: false,
      mutedUntil: 0
    };

    ws.send(JSON.stringify({
      type: 'init',
      history: messages,
      onlineCount: getOnlineCount()
    }));

    broadcastWS({ type: 'online_count', count: getOnlineCount() });

    ws.on('message', (rawMessage) => {
      try {
        const data = JSON.parse(rawMessage.toString());

        if (data.type === 'join') {
          if (data.user && typeof data.user === 'string') {
            socketState.userName = sanitizeText(data.user).slice(0, 24) || 'Invitado';
          }
          broadcastWS({ type: 'online_count', count: getOnlineCount() });
          return;
        }

        if (data.type === 'typing') {
          const isTyping = Boolean(data.isTyping);
          const name = socketState.userName || 'Usuario';
          if (isTyping) typingUsers.set(name, Date.now());
          else typingUsers.delete(name);

          const typingPayload = JSON.stringify({ type: 'typing', user: name, isTyping });
          wss.clients.forEach((client) => {
            if (client !== ws && client.readyState === WebSocket.OPEN) {
              client.send(typingPayload);
            }
          });
          return;
        }

        if (data.type === 'message') {
          const now = Date.now();
          if (socketState.isMuted && now < socketState.mutedUntil) {
            const remainingSecs = Math.ceil((socketState.mutedUntil - now) / 1000);
            ws.send(JSON.stringify({ type: 'error', message: `Estás silenciado temporalmente (${remainingSecs}s restantes).` }));
            return;
          } else if (socketState.isMuted && now >= socketState.mutedUntil) {
            socketState.isMuted = false;
          }

          if (now - socketState.lastMsgTime < 1200) {
            ws.send(JSON.stringify({ type: 'error', message: 'Escribes demasiado rápido. Espera un segundo.' }));
            return;
          }

          const cleanText = sanitizeText(data.text);
          if (!cleanText || cleanText.length > 400) return;

          if (data.user && typeof data.user === 'string') {
            socketState.userName = sanitizeText(data.user).slice(0, 24) || socketState.userName;
          }

          socketState.lastMsgTime = now;

          const newMsg = {
            id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
            user: socketState.userName,
            text: cleanText,
            timestamp: now,
            isSystem: Boolean(data.isSystem),
            isAdmin: Boolean(data.isAdmin)
          };

          messages.push(newMsg);
          saveMessages();

          broadcastWS({ type: 'new_message', message: newMsg });
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
            const sysMsg = { id: 'sys_' + Date.now(), user: 'Sistema Admin', text: '🛡️ El historial de chat ha sido vaciado.', timestamp: Date.now(), isSystem: true };
            messages.push(sysMsg);
            saveMessages();
            broadcastWS({ type: 'new_message', message: sysMsg });
          } else if (data.action === 'delete_message') {
            messages = messages.filter(m => m.id !== data.msgId);
            saveMessages();
            broadcastWS({ type: 'delete_message', msgId: data.msgId });
          } else if (data.action === 'broadcast') {
            const cleanText = sanitizeText(data.text);
            if (cleanText) {
              const systemMsg = { id: 'sys_' + Date.now(), user: '⚡ ANUNCIO OFICIAL', text: cleanText, timestamp: Date.now(), isSystem: true, isAdmin: true };
              messages.push(systemMsg);
              saveMessages();
              broadcastWS({ type: 'new_message', message: systemMsg });
            }
          }
        }

      } catch (e) {
        console.error('Error procesando mensaje websocket:', e.message);
      }
    });

    ws.on('close', () => {
      broadcastWS({ type: 'online_count', count: getOnlineCount() });
    });
  });
}

server.listen(PORT, () => {
  console.log(`Servidor iniciado en http://localhost:${PORT}`);
});
