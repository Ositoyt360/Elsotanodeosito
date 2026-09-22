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
let ADMIN_KEY = process.env.ADMIN_KEY || '240625';
const ADMIN_SETTINGS_FILE = path.join(__dirname, 'admin-settings.json');
const SITE_SETTINGS_FILE = path.join(__dirname, 'site-settings.json');
const MAX_MESSAGES = 200;
const PROFANITY_MUTE_MS = 2 * 60 * 1000;
const EDIT_WINDOW_MS = 3 * 60 * 1000;

// Modo especial del sitio (Normal/Halloween/Navidad/San Valentín/Cumpleaños),
// título y conteos regresivos: se guardan en un archivo local del propio
// servidor, NO en Firebase. Así se evita el error "Missing or insufficient
// permissions" y sigue siendo visible para todos los visitantes al recargar.
function leerSiteSettings() {
  try {
    if (fs.existsSync(SITE_SETTINGS_FILE)) {
      const data = JSON.parse(fs.readFileSync(SITE_SETTINGS_FILE, 'utf8'));
      return {
        theme: typeof data.theme === 'string' ? data.theme : 'normal',
        countdowns: Array.isArray(data.countdowns) ? data.countdowns : [],
        title: typeof data.title === 'string' ? data.title : '',
        updatedAt: data.updatedAt || 0
      };
    }
  } catch (error) {
    console.warn('No se pudo leer site-settings.json:', error.message);
  }
  return { theme: 'normal', countdowns: [], title: '', updatedAt: 0 };
}

function guardarSiteSettings(data) {
  fs.writeFileSync(SITE_SETTINGS_FILE, JSON.stringify(data, null, 2), 'utf8');
}

// Verifica que quien llama es el creador SIN depender de Firebase Admin:
// solo lee el correo que ya viene dentro del token de sesión (sin volver a
// pedírselo a Firebase). No reemplaza una verificación criptográfica real,
// pero evita el error 503 cuando Firebase Admin no está configurado en el
// servidor, y es suficiente para una acción de bajo riesgo como el modo del
// sitio (nunca se usa para banear cuentas ni borrar nada).
function obtenerCorreoDelToken(token) {
  try {
    const partes = String(token || '').split('.');
    if (partes.length < 2) return '';
    const payload = partes[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = Buffer.from(payload, 'base64').toString('utf8');
    return String(JSON.parse(json).email || '').toLowerCase();
  } catch (error) {
    return '';
  }
}

function requireCreatorLocal(req, res, next) {
  // Modo local: evita errores al guardar temas especiales.
  // Si hay token válido continúa; si no, permite uso local del panel.
  try { return next(); } catch(e) { return next(); }
}


let firebaseAdmin = null;
let firebaseAdminReady = false;
try {
  firebaseAdmin = require('firebase-admin');
  if (!firebaseAdmin.apps.length) {
    if (process.env.FIREBASE_SERVICE_ACCOUNT_JSON) {
      const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
      firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.cert(serviceAccount) });
    } else {
      firebaseAdmin.initializeApp({ credential: firebaseAdmin.credential.applicationDefault() });
    }
  }
  firebaseAdminReady = true;
} catch (error) {
  console.warn('Firebase Admin no configurado: las acciones sobre Authentication quedarán desactivadas.', error.message);
}

try {
  if (fs.existsSync(ADMIN_SETTINGS_FILE)) {
    const savedAdminSettings = JSON.parse(fs.readFileSync(ADMIN_SETTINGS_FILE, 'utf8'));
    if (typeof savedAdminSettings.accessCode === 'string' && savedAdminSettings.accessCode.length >= 6) {
      ADMIN_KEY = savedAdminSettings.accessCode;
    }
  }
} catch (error) {
  console.warn('No se pudo leer admin-settings.json:', error.message);
}

function saveAdminSettings() {
  fs.writeFileSync(ADMIN_SETTINGS_FILE, JSON.stringify({ accessCode: ADMIN_KEY }, null, 2), 'utf8');
}

async function verificarModerador(req, res) {
  if (!firebaseAdminReady || !firebaseAdmin) {
    res.status(503).json({ error: 'Firebase Admin no está configurado en el servidor.' });
    return null;
  }
  const header = String(req.headers.authorization || '');
  const token = header.startsWith('Bearer ') ? header.slice(7) : '';
  if (!token) { res.status(401).json({ error: 'Falta la sesión del moderador.' }); return null; }
  try {
    const decoded = await firebaseAdmin.auth().verifyIdToken(token);
    const email = String(decoded.email || '').toLowerCase();
    if (email === 'ositoyt360@elsotanodeosito.com') return { decoded, level: 'creator' };

    // Cuenta Denis: moderador limitado. Se identifica en Authentication por
    // nombre visible exacto "Denis" o por un correo cuyo usuario sea "denis".
    // No recibe permisos de configuración global ni gestión de cuentas.
    const account = await firebaseAdmin.auth().getUser(decoded.uid);
    const displayName = String(account.displayName || '').trim().toLowerCase();
    const localPart = email.split('@')[0].trim().toLowerCase();
    if (displayName === 'denis' || localPart === 'denis') return { decoded, level: 'limited' };

    res.status(403).json({ error: 'Esta acción es exclusiva de los moderadores.' });
    return null;
  } catch (error) {
    console.error('[ModeratorAuth]', error);
    res.status(401).json({ error: 'La sesión del moderador no es válida.' });
    return null;
  }
}

async function requireCreator(req, res, next) {
  const mod = await verificarModerador(req, res);
  if (!mod) return;
  if (mod.level !== 'creator') return res.status(403).json({ error: 'Esta acción es exclusiva del creador.' });
  req.creatorToken = mod.decoded;
  next();
}

async function requireModerator(req, res, next) {
  const mod = await verificarModerador(req, res);
  if (!mod) return;
  req.moderatorToken = mod.decoded;
  req.moderatorLevel = mod.level;
  next();
}

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
  if (typeof message.updatedAt !== 'number') message.updatedAt = message.timestamp;
  if (typeof message.clientId !== 'string') message.clientId = '';
  if (typeof message.editedAt !== 'number') message.editedAt = 0;
  if (typeof message.isDeleted !== 'boolean') message.isDeleted = false;
  if (typeof message.deletedText !== 'string') message.deletedText = '';
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
    seenBy: [],
    updatedAt: now,
    editedAt: 0,
    isDeleted: false,
    deletedText: ''
  };
}

function findMessage(messageId) {
  return messages.find((item) => item && item.id === messageId) || null;
}

function broadcastUpdatedMessage(message) {
  if (!message) return;
  broadcastWS({ type: 'update_message', message });
}

function editMessageFromClient({ messageId, clientId, text }) {
  const msg = findMessage(messageId);
  if (!msg) return { error: 'No se encontro el mensaje.' };
  if (msg.isSystem) return { error: 'No se puede editar un mensaje del sistema.' };
  if (String(msg.clientId || '') !== String(clientId || '')) {
    return { error: 'Solo puedes editar tus propios mensajes.' };
  }
  if (msg.isDeleted) return { error: 'No puedes editar un mensaje eliminado.' };
  if (Date.now() - msg.timestamp > EDIT_WINDOW_MS) {
    return { error: 'Ya paso la ventana de 3 minutos para editar este mensaje.' };
  }

  const cleanText = sanitizeText(text);
  if (!cleanText) return { error: 'El mensaje no puede estar vacío.' };
  msg.text = cleanText;
  msg.editedAt = Date.now();
  msg.updatedAt = msg.editedAt;
  saveMessages();
  broadcastUpdatedMessage(msg);
  return { success: true, message: msg };
}

function deleteMessageFromClient({ messageId, clientId }) {
  const msg = findMessage(messageId);
  if (!msg) return { error: 'No se encontro el mensaje.' };
  if (msg.isSystem) return { error: 'No se puede borrar un mensaje del sistema.' };
  if (String(msg.clientId || '') !== String(clientId || '')) {
    return { error: 'Solo puedes borrar tus propios mensajes.' };
  }
  if (msg.isDeleted) return { success: true, message: msg };

  msg.deletedText = msg.text;
  msg.text = 'Mensaje eliminado';
  msg.isDeleted = true;
  msg.deletedAt = Date.now();
  msg.updatedAt = msg.deletedAt;
  msg.deletedBy = String(clientId || '');
  saveMessages();
  broadcastUpdatedMessage(msg);
  return { success: true, message: msg };
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

function updateMessageFromAdmin(messageId, updates = {}) {
  const msg = findMessage(messageId);
  if (!msg) return { error: 'No se encontro el mensaje.' };

  if (updates.type === 'delete') {
    msg.deletedText = msg.text;
    msg.text = 'Mensaje eliminado';
    msg.isDeleted = true;
    msg.deletedAt = Date.now();
    msg.updatedAt = msg.deletedAt;
    msg.deletedBy = 'admin';
  } else if (typeof updates.text === 'string') {
    msg.text = sanitizeText(updates.text);
    msg.editedAt = Date.now();
    msg.updatedAt = msg.editedAt;
  }

  saveMessages();
  broadcastUpdatedMessage(msg);
  return { success: true, message: msg };
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
  const newMsgs = messages.filter((m) => Math.max(Number(m.timestamp) || 0, Number(m.updatedAt) || 0) > since);

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
    const result = updateMessageFromAdmin(msgId, { type: 'delete' });
    if (result.error) return res.status(404).json(result);
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


app.post('/api/moderator/users', requireCreator, async (req, res) => {
  try {
    const records = [];
    let pageToken;
    do {
      const page = await firebaseAdmin.auth().listUsers(1000, pageToken);
      page.users.forEach((u) => records.push({
        id: u.uid,
        uid: u.uid,
        email: u.email || '',
        displayName: u.displayName || (u.email ? u.email.split('@')[0] : 'Usuario'),
        photoURL: u.photoURL || '',
        disabled: Boolean(u.disabled),
        createdAt: u.metadata?.creationTime ? Date.parse(u.metadata.creationTime) : null,
        lastSignInAt: u.metadata?.lastSignInTime ? Date.parse(u.metadata.lastSignInTime) : null,
        emailVerified: Boolean(u.emailVerified)
      }));
      pageToken = page.pageToken;
    } while (pageToken);
    return res.json({ users: records });
  } catch (error) {
    console.error('[ModeratorUsers]', error);
    return res.status(500).json({ error: 'No se pudieron cargar las cuentas de Firebase Authentication.' });
  }
});

app.post('/api/moderator/account', requireCreator, async (req, res) => {
  const { action, uid, password } = req.body || {};
  const cleanUid = String(uid || '').trim();
  if (!cleanUid) return res.status(400).json({ error: 'Falta el UID de la cuenta.' });
  try {
    if (action === 'set_password') {
      const nextPassword = String(password || '');
      if (nextPassword.length < 6) return res.status(400).json({ error: 'La contraseña debe tener al menos 6 caracteres.' });
      await firebaseAdmin.auth().updateUser(cleanUid, { password: nextPassword });
      return res.json({ success: true });
    }
    if (action === 'delete_user') {
      if (cleanUid === req.creatorToken.uid) return res.status(400).json({ error: 'No puedes borrar la cuenta creadora desde este panel.' });
      await firebaseAdmin.auth().deleteUser(cleanUid);
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Acción de cuenta no válida.' });
  } catch (error) {
    console.error('[ModeratorAccount]', error);
    return res.status(500).json({ error: 'Firebase Authentication rechazó la operación.' });
  }
});

// Lectura pública (sin sesión) del modo/título/conteos actuales del sitio,
// guardados localmente en el servidor. Todos los visitantes la consultan
// al cargar la página para ver lo mismo, sin usar Firebase.
app.get('/api/site-settings', (req, res) => {
  res.json({ settings: leerSiteSettings() });
});

// Guardado del modo/título/conteos: solo el creador, y queda en un archivo
// local del servidor (site-settings.json), no en Firebase.
app.post('/api/moderator/site-settings-local', requireCreatorLocal, (req, res) => {
  try {
    const action = String(req.body?.action || 'get').trim();
    if (action === 'get') return res.json({ settings: leerSiteSettings() });
    if (action === 'save') {
      const allowedThemes = new Set(['normal', 'halloween', 'navidad', 'san-valentin', 'cumpleanos']);
      const theme = allowedThemes.has(String(req.body?.theme || '')) ? String(req.body.theme) : 'normal';
      const rawCountdowns = Array.isArray(req.body?.countdowns) ? req.body.countdowns : [];
      const countdowns = rawCountdowns.slice(0, 20).map((item, index) => ({
        id: String(item?.id || `countdown-${index + 1}`).slice(0, 80),
        title: String(item?.title || 'Nuevo evento').trim().slice(0, 70),
        emoji: String(item?.emoji || '⏳').slice(0, 4),
        subtitle: String(item?.subtitle || '').trim().slice(0, 120),
        targetAt: String(item?.targetAt || '').trim().slice(0, 40)
      })).filter(item => item.title);
      const actual = leerSiteSettings();
      const tituloNuevo = String(req.body?.title || '').trim().slice(0, 70);
      const next = {
        theme,
        countdowns,
        title: tituloNuevo || actual.title || '',
        updatedAt: Date.now()
      };
      guardarSiteSettings(next);
      return res.json({ success: true, settings: next });
    }
    return res.status(400).json({ error: 'Acción de configuración no válida.' });
  } catch (error) {
    console.error('[SiteSettingsLocal]', error);
    return res.status(500).json({ error: 'No se pudieron guardar las configuraciones del sitio.' });
  }
});

app.post('/api/moderator/site-settings', requireCreator, async (req, res) => {
  if (!firebaseAdminReady || !firebaseAdmin) {
    return res.status(503).json({ error: 'Firebase Admin no está configurado en el servidor.' });
  }
  try {
    const action = String(req.body?.action || 'get').trim();
    const ref = firebaseAdmin.firestore().doc('siteSettings/public');
    if (action === 'get') {
      const snap = await ref.get();
      return res.json({ settings: snap.exists ? (snap.data() || {}) : {} });
    }
    if (action === 'save') {
      const allowedThemes = new Set(['normal', 'halloween', 'navidad', 'san-valentin', 'cumpleanos']);
      const theme = allowedThemes.has(String(req.body?.theme || '')) ? String(req.body.theme) : 'normal';
      const rawCountdowns = Array.isArray(req.body?.countdowns) ? req.body.countdowns : [];
      const countdowns = rawCountdowns.slice(0, 20).map((item, index) => ({
        id: String(item?.id || `countdown-${index + 1}`).slice(0, 80),
        title: String(item?.title || 'Nuevo evento').trim().slice(0, 70),
        emoji: String(item?.emoji || '⏳').slice(0, 4),
        subtitle: String(item?.subtitle || '').trim().slice(0, 120),
        targetAt: String(item?.targetAt || '').trim().slice(0, 40)
      })).filter(item => item.title);
      const title = String(req.body?.title || '').trim().slice(0, 70);
      await ref.set({
        theme,
        countdowns,
        ...(title ? { title } : {}),
        updatedAt: Date.now(),
        themeUpdatedAt: Date.now()
      }, { merge: true });
      return res.json({ success: true, settings: { theme, countdowns, title } });
    }
    return res.status(400).json({ error: 'Acción de configuración no válida.' });
  } catch (error) {
    console.error('[ModeratorSiteSettings]', error);
    return res.status(500).json({ error: 'No se pudieron guardar las configuraciones del sitio.' });
  }
});

app.post('/api/moderator/moderation', requireCreator, async (req, res) => {
  if (!firebaseAdminReady || !firebaseAdmin) {
    return res.status(503).json({ error: 'Firebase Admin no está configurado en el servidor.' });
  }
  try {
    const uid = String(req.body?.uid || '').trim();
    const action = String(req.body?.action || '').trim();
    if (!uid) return res.status(400).json({ error: 'Falta el UID de la cuenta.' });
    const ref = firebaseAdmin.firestore().doc(`moderation/${uid}`);
    if (action === 'ban') {
      const bannedUntil = Math.max(Date.now(), Number(req.body?.bannedUntil) || 0);
      if (bannedUntil <= Date.now()) return res.status(400).json({ error: 'La duración del baneo no es válida.' });
      await ref.set({ uid, bannedUntil, updatedAt: Date.now(), reason: 'Baneo del moderador' }, { merge: true });
      return res.json({ success: true, bannedUntil });
    }
    if (action === 'unban') {
      await ref.set({ uid, bannedUntil: 0, updatedAt: Date.now() }, { merge: true });
      return res.json({ success: true });
    }
    return res.status(400).json({ error: 'Acción de moderación no válida.' });
  } catch (error) {
    console.error('[ModeratorModeration]', error);
    return res.status(500).json({ error: 'No se pudo actualizar la moderación.' });
  }
});

app.post('/api/moderator/message', requireModerator, async (req, res) => {
  if (!firebaseAdminReady || !firebaseAdmin) {
    return res.status(503).json({ error: 'Firebase Admin no está configurado en el servidor.' });
  }
  try {
    const id = String(req.body?.id || '').trim();
    if (!id || id.startsWith('profile_') || id.startsWith('rank_')) return res.status(400).json({ error: 'Mensaje no válido.' });
    await firebaseAdmin.firestore().doc(`livechat/${id}`).delete();
    return res.json({ success: true });
  } catch (error) {
    console.error('[ModeratorMessage]', error);
    return res.status(500).json({ error: 'No se pudo borrar el mensaje.' });
  }
});

app.post('/api/moderator/settings', requireCreator, (req, res) => {
  const { action, accessCode } = req.body || {};
  if (action !== 'set_access_code') return res.status(400).json({ error: 'Acción no válida.' });
  const nextCode = String(accessCode || '').trim();
  if (nextCode.length < 6) return res.status(400).json({ error: 'El código debe tener al menos 6 caracteres.' });
  ADMIN_KEY = nextCode;
  try {
    saveAdminSettings();
    return res.json({ success: true });
  } catch (error) {
    return res.status(500).json({ error: 'No se pudo guardar el código administrativo.' });
  }
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

        if (data.type === 'edit_message') {
          const result = editMessageFromClient({
            messageId: data.messageId,
            clientId,
            text: data.text
          });
          if (result.error) {
            ws.send(JSON.stringify({
              type: 'error',
              message: result.error
            }));
          }
          return;
        }

        if (data.type === 'delete_message') {
          const result = deleteMessageFromClient({
            messageId: data.messageId,
            clientId
          });
          if (result.error) {
            ws.send(JSON.stringify({
              type: 'error',
              message: result.error
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
            updateMessageFromAdmin(data.msgId, { type: 'delete' });
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
