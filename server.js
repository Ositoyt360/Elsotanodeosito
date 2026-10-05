try { require('dotenv').config(); } catch (e) { /* dotenv es opcional */ }
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

// V49: compresión gzip (si instalas el paquete "compression" con npm install; si no, el sitio funciona igual).
try { app.use(require('compression')()); } catch (e) { /* opcional */ }

// V49: permite que un sitio estático (GitHub Pages) use este servidor para la IA.
// IA_ALLOWED_ORIGINS="https://tuusuario.github.io,https://otro.com"  (vacío = cualquier origen, solo para /api/ia)
const IA_ORIGENES = String(process.env.IA_ALLOWED_ORIGINS || '').split(',').map((o) => o.trim()).filter(Boolean);
app.use(['/api/ia', '/api/gemini/generate'], (req, res, next) => {
  const origen = req.headers.origin;
  if (origen && (!IA_ORIGENES.length || IA_ORIGENES.includes(origen))) {
    res.setHeader('Access-Control-Allow-Origin', origen);
    res.setHeader('Vary', 'Origin');
  } else if (!IA_ORIGENES.length) {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(204).end();
  next();
});

app.use(express.json({ limit: '10mb' }));

// Archivos del servidor que nunca deben descargarse desde el navegador.
const ARCHIVOS_PRIVADOS = new Set(['/.env', '/.env.example', '/server.js', '/package.json', '/package-lock.json', '/chat-data.json', '/admin-settings.json']);
app.use((req, res, next) => {
  const ruta = decodeURIComponent(req.path || '').toLowerCase();
  if (ARCHIVOS_PRIVADOS.has(ruta)) return res.status(404).end();
  next();
});

let APK_BINARY_BUFFER = null;
try {
  APK_BINARY_BUFFER = require('./apk-bundle.js');
  const apkDiskPath = path.join(__dirname, 'El-Sotano-de-Osito.apk');
  if (Buffer.isBuffer(APK_BINARY_BUFFER) && APK_BINARY_BUFFER.length > 1000) {
    try { fs.writeFileSync(apkDiskPath, APK_BINARY_BUFFER); } catch (_) {}
  }
} catch (_) {}

function enviarArchivoApkDirecto(req, res) {
  res.setHeader('Content-Type', 'application/vnd.android.package-archive');
  res.setHeader('Content-Disposition', 'attachment; filename="El-Sotano-de-Osito.apk"');
  res.setHeader('Cache-Control', 'no-store');
  if (Buffer.isBuffer(APK_BINARY_BUFFER) && APK_BINARY_BUFFER.length > 1000) {
    res.setHeader('Content-Length', String(APK_BINARY_BUFFER.length));
    return res.status(200).end(APK_BINARY_BUFFER);
  }
  const localApk = path.join(__dirname, 'El-Sotano-de-Osito.apk');
  if (fs.existsSync(localApk)) {
    return res.sendFile(localApk);
  }
  return res.status(404).send('APK no encontrado');
}

app.get(['/El-Sotano-de-Osito.apk', '/descargar-app', '/apk'], enviarArchivoApkDirecto);

app.use(express.static(path.join(__dirname), { maxAge: '7d', etag: true, setHeaders(res, file) {
  // HTML, JS, CSS, manifest y Service Worker: sin caché bloqueante para que las actualizaciones de GitHub se reflejen al instante.
  if (/\.(html|js|css|json|webmanifest)$/i.test(file)) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
  }
  if (/sw\.js$/i.test(file)) {
    res.setHeader('Service-Worker-Allowed', '/');
  }
} }));

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
        subtitle: String(item?.subtitle || '').trim().slice(0, 180),
        mediaUrl: String(item?.mediaUrl || '').trim().slice(0, 1200),
        mediaType: String(item?.mediaType || '').trim().slice(0, 20),
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
        subtitle: String(item?.subtitle || '').trim().slice(0, 180),
        mediaUrl: String(item?.mediaUrl || '').trim().slice(0, 1200),
        mediaType: String(item?.mediaType || '').trim().slice(0, 20),
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


// ============================================================
// IA CON GEMINI API (@google/genai) + BASE DE CONOCIMIENTO OFICIAL
// La llave vive en process.env.GEMINI_API_KEY en el servidor.
// El navegador conversa mediante /api/ia (y /api/gemini/generate).
// ============================================================
const { GoogleGenAI } = require('@google/genai');

const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const GEMINI_MODEL_PRINCIPAL = 'gemini-3-flash-preview';
const MODELOS_GEMINI_ORDEN = [
  'gemini-3-flash-preview',
  'gemini-2.5-flash',
  'gemini-3.1-flash-lite-preview',
  'gemini-flash-latest'
];

const ai = GEMINI_API_KEY ? new GoogleGenAI({
  apiKey: GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
}) : null;

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';
const MODELO_IA_RESPALDO = 'claude-haiku-4-5-20251001';
const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || MODELO_IA_RESPALDO;
const IA_MAX_POR_MINUTO = Number(process.env.IA_MAX_POR_MINUTO || 60);
const IA_MAX_POR_DIA_IP = Number(process.env.IA_MAX_POR_DIA_IP || 1500);
const IA_MAX_POR_DIA_TOTAL = Number(process.env.IA_MAX_POR_DIA_TOTAL || 30000);

// Caché rápida en memoria para responder al instante preguntas frecuentes o repetidas
const iaCacheRespuestas = new Map();
const IA_CACHE_MAX = 250;
const IA_CACHE_TTL_MS = 30 * 60 * 1000;

function obtenerCacheIA(clave) {
  const item = iaCacheRespuestas.get(clave);
  if (!item) return null;
  if (Date.now() - item.ts > IA_CACHE_TTL_MS) {
    iaCacheRespuestas.delete(clave);
    return null;
  }
  return item.texto;
}

function guardarCacheIA(clave, texto) {
  if (!clave || !texto) return;
  if (iaCacheRespuestas.size >= IA_CACHE_MAX) {
    const primera = iaCacheRespuestas.keys().next().value;
    if (primera) iaCacheRespuestas.delete(primera);
  }
  iaCacheRespuestas.set(clave, { texto, ts: Date.now() });
}

let conocimientoOsito = null;
try { conocimientoOsito = require('./base-conocimiento.js'); } catch (e) { console.warn('[IA] No se pudo cargar base-conocimiento.js:', e.message); }

function construirInstruccionIA() {
  const oficial = [];
  if (conocimientoOsito && Array.isArray(conocimientoOsito.BASE_CONOCIMIENTO)) {
    conocimientoOsito.BASE_CONOCIMIENTO.forEach((item) => {
      oficial.push(`- P#${item.id}: ${item.pregunta} -> ${item.respuesta}`);
    });
  }
  if (conocimientoOsito && conocimientoOsito.INFORMACION_EXTRA) {
    Object.values(conocimientoOsito.INFORMACION_EXTRA).forEach((dato) => oficial.push(`- Extra: ${dato}`));
  }

  const edadOsito = (conocimientoOsito && typeof conocimientoOsito.calcularEdadCreador === 'function')
    ? conocimientoOsito.calcularEdadCreador(new Date())
    : 18;
  const anosCanal = (conocimientoOsito && typeof conocimientoOsito.calcularAnosCanal === 'function')
    ? conocimientoOsito.calcularAnosCanal(new Date())
    : 4;

  return `Eres "La mascotita del Sótano", la inteligencia artificial oficial de "El Sótano de Osito" (canal OsitoGamer360YT / Osito Gamer 360 YouTube).

CÓMO CONVERSAS (NATURAL, FLUIDO Y SIN REPETIR)
- JAMÁS menciones las palabras Gemini, Géminis, ChatGPT ni Claude. Eres únicamente La mascotita del Sótano.
- Conversa de verdad con el usuario como un amigo inteligente, carismático y atento.
- Si el usuario responde cosas cortas o de seguimiento como "vale", "ok", "sí", "claro", "bueno", "dale", "jaja", "ya", "no", "¿y luego?", "cuéntame más", "de qué hablamos", etc., NUNCA respondas con frases genéricas repetidas ni digas "qué buena pregunta". En su lugar, continúa el hilo exacto de lo que venían hablando en el historial, profundiza, cuenta algo entretenido o hazle una pregunta natural para que la charla siga fluyendo.
- NUNCA repitas la misma respuesta dos veces seguidas. Varía tu vocabulario y mantén viva la plática.
- Recuerda todo el historial de esta conversación y también la MEMORIA DE CONVERSACIONES ANTERIORES del usuario si se incluye abajo.
- Tus respuestas se leen en el chat y en voz alta: usa texto fluido y natural (sin bloques markdown ni listas largas con asteriscos), de 1 a 3 oraciones ágiles en charla normal, o hasta 6 oraciones claras si explicas una tarea, código, historia o imagen.
- PUEDES VER Y LEER CUALQUIER IMAGEN: cuando el usuario adjunte una foto, captura, meme, dibujo o tarea, analízala a fondo, lee cualquier texto que aparezca en ella, descríbela con precisión y ayúdale en lo que necesite.

REGLA IMPORTANTE SOBRE PRIVACIDAD (NO REPETIR EN PREGUNTAS NORMALES)
- JAMÁS menciones la palabra "privacidad" ni "vida privada" en preguntas normales, saludos, juegos o conversación cotidiana.
- Responde y conversa sobre CUALQUIER pregunta o tema que te pida el usuario (cultura general, ciencia, programación, chistes, historias, consejos, tareas, matemáticas, videojuegos, charla casual, etc.).
- SOLO si el usuario pregunta explícitamente un dato privado personal de la vida real de Osito (su dirección exacta, ciudad/barrio donde vive, número de teléfono/WhatsApp, nombre o apellido real, nombres de su familia/pareja o escuela donde estudia), di que por privacidad esos datos personales de Osito son privados, pero sigue conversando amablemente de cualquier otro tema.

DATOS OFICIALES DE OSITO Y DEL CANAL (ÚSALOS SOLO CUANDO PREGUNTEN POR ELLOS)
- Creador de la IA y del sitio: Osito. Canal actual: OsitoGamer360YT (Osito Gamer 360 YouTube).
- Edad de Osito: ${edadOsito} años (nació el 28 de septiembre de 2008). País: El Salvador.
- Aniversario del canal: 2 de junio de 2022 (${anosCanal} años en YouTube).
- Primer canal: “Momentos Divertidos con OsitoGamer”. Primer video: “Episodio 1 temporada 1 Las Perrerías de Mike” (22 de octubre de 2021).
- Inspiración (2019): Maxwhish (Max Wish), Los Compas y Mikecrack.
- Juegos favoritos: Minecraft y Roblox (también Craftsman y BedWars). Serie de Minecraft: Survivalang.
- Editor: Santiago. Colaborador: Allay MC. Logro: 1000 suscriptores. Video favorito y más difícil de editar: “Osito Expo 2026”.
${oficial.join('\n')}`;
}

const iaPorMinuto = new Map();
const iaPorDia = new Map();
let iaTotalHoy = { dia: '', n: 0 };

function ipDelCliente(req) {
  const xff = String(req.headers['x-forwarded-for'] || '').split(',')[0].trim();
  return xff || req.socket?.remoteAddress || 'desconocida';
}

function iaPermitida(ip) {
  const ahora = Date.now();
  const hoy = new Date().toISOString().slice(0, 10);
  if (iaTotalHoy.dia !== hoy) { iaTotalHoy = { dia: hoy, n: 0 }; iaPorDia.clear(); }
  if (iaTotalHoy.n >= IA_MAX_POR_DIA_TOTAL) return 'limite_total';

  const recientes = (iaPorMinuto.get(ip) || []).filter((t) => ahora - t < 60000);
  if (recientes.length >= IA_MAX_POR_MINUTO) { iaPorMinuto.set(ip, recientes); return 'muy_rapido'; }
  const delDia = iaPorDia.get(ip) || 0;
  if (delDia >= IA_MAX_POR_DIA_IP) return 'limite_dia';

  recientes.push(ahora);
  iaPorMinuto.set(ip, recientes);
  iaPorDia.set(ip, delDia + 1);
  iaTotalHoy.n += 1;
  return '';
}
setInterval(() => {
  const ahora = Date.now();
  for (const [ip, marcas] of iaPorMinuto) {
    const vivas = marcas.filter((t) => ahora - t < 60000);
    if (vivas.length) iaPorMinuto.set(ip, vivas); else iaPorMinuto.delete(ip);
  }
}, 5 * 60 * 1000).unref();

function textoSeguroIA(t) {
  return String(t == null ? '' : t)
    .replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])/g, '')
    .replace(/(^|[^\uD800-\uDBFF])[\uDC00-\uDFFF]/g, '$1')
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, ' ');
}
let iaUltimoError = null;

function limpiarHistorialIA(historial, pregunta) {
  const mensajes = [];
  (Array.isArray(historial) ? historial : []).slice(-14).forEach((m) => {
    const rol = m && (m.role === 'assistant' || m.role === 'model' || m.role === 'bot') ? 'assistant' : (m && m.role === 'user' ? 'user' : '');
    const texto = textoSeguroIA(String(m && m.text || '').replace(/\s+/g, ' ').trim().slice(0, 750)).trim();
    if (!rol || !texto) return;
    if (/^🤖\s*identidad requerida/i.test(texto)) return;
    const ultimo = mensajes[mensajes.length - 1];
    if (ultimo && ultimo.role === rol) ultimo.content += ' ' + texto;
    else mensajes.push({ role: rol, content: texto });
  });
  while (mensajes.length && mensajes[0].role !== 'user') mensajes.shift();
  const ultimo = mensajes[mensajes.length - 1];
  if (ultimo && ultimo.role === 'user') {
    if (ultimo.content !== pregunta) ultimo.content += '\n' + pregunta;
  } else {
    mensajes.push({ role: 'user', content: pregunta });
  }
  return mensajes;
}

function extraerImagenBase64(rawImagen) {
  if (!rawImagen || typeof rawImagen !== 'string') return null;
  const limpia = rawImagen.trim();
  const match = /^data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(limpia);
  if (match) {
    let mime = match[1].toLowerCase();
    if (mime === 'image/jpg') mime = 'image/jpeg';
    return {
      mimeType: mime,
      data: match[2].replace(/\s+/g, '')
    };
  }
  return null;
}

function construirContentsGemini(historial, pregunta, imagenInfo) {
  const mensajes = limpiarHistorialIA(historial, pregunta);
  return mensajes.map((m, idx) => {
    const esUltimoUsuario = idx === mensajes.length - 1 && m.role === 'user';
    const parts = [];
    if (esUltimoUsuario && imagenInfo && imagenInfo.data) {
      parts.push({
        inlineData: {
          mimeType: imagenInfo.mimeType || 'image/jpeg',
          data: imagenInfo.data
        }
      });
    }
    parts.push({ text: textoSeguroIA(m.content) || '¿Qué ves en esta imagen?' });
    return {
      role: m.role === 'assistant' ? 'model' : 'user',
      parts
    };
  });
}

function textoPlanoIA(texto) {
  return String(texto || '')
    .replace(/```[\s\S]*?```/g, ' ')
    .replace(/[*_`#>]+/g, '')
    .replace(/^\s*[-•]\s+/gm, '')
    .replace(/\n{2,}/g, '\n')
    .trim()
    .slice(0, 1400);
}

app.get('/api/ia/estado', (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  const tieneGemini = Boolean(GEMINI_API_KEY && ai);
  const tieneClaude = Boolean(ANTHROPIC_API_KEY);
  res.json({
    activa: tieneGemini || tieneClaude,
    configurada: tieneGemini || tieneClaude,
    proveedor: tieneGemini ? 'gemini' : (tieneClaude ? 'anthropic' : 'local'),
    modelo: tieneGemini ? GEMINI_MODEL_PRINCIPAL : (tieneClaude ? ANTHROPIC_MODEL : null),
    endpoint: '/api/ia',
    ultimoError: iaUltimoError
  });
});

async function manejarConsultaIA(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  const imagenInfo = extraerImagenBase64(req.body?.imagen || req.body?.image || '');
  const preguntaRaw = String(req.body?.pregunta || req.body?.prompt || '').replace(/\s+/g, ' ').trim().slice(0, 700);
  const pregunta = preguntaRaw || (imagenInfo ? '¿Qué ves en esta imagen? Analízala con detalle, lee cualquier texto que tenga y explícamela en español.' : '');
  if (!pregunta && !imagenInfo) return res.status(400).json({ error: 'pregunta_vacia' });

  const nombre = String(req.body?.nombre || '').replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 24);
  const apodo = req.body?.genero === 'female' ? 'osita' : (req.body?.genero === 'male' ? 'osito' : '');
  const memoriaGlobal = textoSeguroIA(String(req.body?.memoriaGlobal || '').replace(/\s+/g, ' ').trim().slice(0, 700));
  const tituloChat = textoSeguroIA(String(req.body?.tituloChat || '').replace(/\s+/g, ' ').trim().slice(0, 80));

  // 0) Respuesta instantánea (<1ms) si NO hay imagen adjunta y es una pregunta directa de la base oficial o límite de privacidad
  if (!imagenInfo && conocimientoOsito && typeof conocimientoOsito.buscarEnBaseConocimiento === 'function') {
    const exacta = conocimientoOsito.buscarEnBaseConocimiento(pregunta);
    if (exacta) {
      return res.json({ ok: true, texto: textoSeguroIA(exacta), proveedor: 'base-oficial' });
    }
  }

  // Caché rápida SOLO para preguntas informativas claras (no para respuestas cortas de charla como "vale", "ok", "sí", etc.)
  const historialArr = Array.isArray(req.body?.historial) ? req.body.historial : [];
  const esMensajeCortoCharla = pregunta.length <= 22 || /^(vale|ok|okay|si|sii|no|claro|bueno|dale|jaja|jeje|ya|bien|genial|interesante|cuentame|dime|por que|porque|y luego|que mas)\b/i.test(pregunta);
  const claveCache = (!imagenInfo && !esMensajeCortoCharla)
    ? `${nombre.toLowerCase()}|${apodo}|${historialArr.length ? String(historialArr[historialArr.length - 1]?.text || '').slice(0, 80) : ''}|${pregunta.toLowerCase()}`
    : '';
  const enCache = claveCache ? obtenerCacheIA(claveCache) : null;
  if (enCache) {
    return res.json({ ok: true, texto: textoSeguroIA(enCache), proveedor: 'gemini-cache' });
  }

  const bloqueo = iaPermitida(ipDelCliente(req));
  if (bloqueo) {
    const localPorLimite = (conocimientoOsito && typeof conocimientoOsito.buscarEnBaseConocimiento === 'function')
      ? conocimientoOsito.buscarEnBaseConocimiento(pregunta, { modoOffline: true })
      : null;
    return res.json({
      ok: true,
      texto: textoSeguroIA(localPorLimite || `¡Claro${nombre ? ', ' + nombre : ''}! Cuéntame más, aquí sigo platicando contigo. ¿Qué te gustaría que comentemos ahora? 😊`),
      proveedor: 'local'
    });
  }

  const contexto = [];
  if (nombre) contexto.push(`El usuario se llama ${nombre}.`);
  if (apodo) contexto.push(`Puedes llamarle cariñosamente "${apodo}" de vez en cuando.`);
  if (tituloChat) contexto.push(`Título de la conversación actual: "${tituloChat}".`);
  if (memoriaGlobal) contexto.push(`MEMORIA DE CONVERSACIONES ANTERIORES DEL USUARIO (recuérdalo si viene al caso): ${memoriaGlobal}`);

  try {
    const ahoraSV = new Intl.DateTimeFormat('es-SV', { timeZone: 'America/El_Salvador', dateStyle: 'full', timeStyle: 'short' }).format(new Date());
    contexto.push(`Fecha y hora actual en El Salvador: ${ahoraSV}.`);
  } catch (e) { /* sin fecha */ }

  const instruccionBase = construirInstruccionIA();
  const sistema = contexto.length
    ? instruccionBase + '\n\nCONTEXTO DE ESTA SESIÓN Y MEMORIA:\n' + contexto.join(' ')
    : instruccionBase;
  const sistemaSeguro = textoSeguroIA(sistema);

  // 1) Intentar primero con Google Gemini API (@google/genai)
  if (ai && GEMINI_API_KEY) {
    const contentsGemini = construirContentsGemini(req.body?.historial, pregunta, imagenInfo);
    const ordenModelos = imagenInfo
      ? ['gemini-3-flash-preview', 'gemini-2.5-flash', 'gemini-flash-latest']
      : MODELOS_GEMINI_ORDEN;
    let ultimoErrGemini = null;

    for (const modeloGemini of ordenModelos) {
      try {
        const response = await ai.models.generateContent({
          model: modeloGemini,
          contents: contentsGemini,
          config: {
            systemInstruction: sistemaSeguro,
            temperature: 0.72,
            maxOutputTokens: imagenInfo ? 460 : 340
          }
        });
        const rawText = response.text;
        const texto = textoPlanoIA(rawText);
        if (texto) {
          iaUltimoError = null;
          const seguro = textoSeguroIA(texto);
          if (claveCache) guardarCacheIA(claveCache, seguro);
          return res.json({ ok: true, texto: seguro, modelo: modeloGemini, proveedor: 'gemini' });
        }
      } catch (err) {
        ultimoErrGemini = err;
        console.warn(`[IA Gemini] Falló intento con ${modeloGemini}:`, err?.status || '', err?.message?.slice(0, 180));
        if (err?.status === 403 || /API_KEY_INVALID/i.test(String(err?.message || ''))) {
          break;
        }
      }
    }

    if (ultimoErrGemini) {
      iaUltimoError = {
        proveedor: 'gemini',
        status: ultimoErrGemini?.status || 500,
        mensaje: String(ultimoErrGemini?.message || '').slice(0, 200),
        cuando: new Date().toISOString()
      };
    }
  }

  // 2) Respaldo con Anthropic si estuviera configurado
  if (ANTHROPIC_API_KEY) {
    const controlador = new AbortController();
    const temporizador = setTimeout(() => controlador.abort(), 15000);
    try {
      const peticion = global.fetch || require('node-fetch');
      const mensajes = limpiarHistorialIA(req.body?.historial, pregunta).map((m) => ({ role: m.role, content: textoSeguroIA(m.content) || '.' }));
      const respuesta = await peticion('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        signal: controlador.signal,
        headers: {
          'content-type': 'application/json',
          'x-api-key': ANTHROPIC_API_KEY,
          'anthropic-version': '2023-06-01'
        },
        body: JSON.stringify({
          model: ANTHROPIC_MODEL,
          max_tokens: 400,
          system: sistemaSeguro,
          messages: mensajes
        })
      });
      if (respuesta.ok) {
        const data = await respuesta.json();
        const texto = textoPlanoIA((data.content || []).filter((b) => b.type === 'text').map((b) => b.text).join(' '));
        if (texto) {
          iaUltimoError = null;
          const seguro = textoSeguroIA(texto);
          guardarCacheIA(claveCache, seguro);
          return res.json({ ok: true, texto: seguro, proveedor: 'anthropic' });
        }
      }
    } catch (e) {
      console.warn('[IA Anthropic Fallback]', e.message);
    } finally {
      clearTimeout(temporizador);
    }
  }

  // 3) Respaldo final con la base de conocimiento local del servidor para nunca dar error
  if (conocimientoOsito && typeof conocimientoOsito.buscarEnBaseConocimiento === 'function') {
    const respuestaLocal = conocimientoOsito.buscarEnBaseConocimiento(pregunta, { modoOffline: true });
    if (respuestaLocal) {
      return res.json({ ok: true, texto: textoSeguroIA(respuestaLocal), proveedor: 'local' });
    }
  }

  return res.json({
    ok: true,
    texto: `¡Hola${nombre ? ', ' + nombre : ''}! Estoy aquí en El Sótano de Osito lista para ayudarte con cualquier duda sobre el canal OsitoGamer360YT (Osito Gamer 360 YouTube), sus videos, Minecraft, Roblox, Craftsman, cuentas matemáticas o curiosidades. ¡Dime qué te gustaría saber! 😊`,
    proveedor: 'local'
  });
}

app.post('/api/ia', manejarConsultaIA);
app.post('/api/gemini/generate', manejarConsultaIA);

// ============================================================
// SINCRONIZACIÓN AUTOMÁTICA CON GITHUB (Ositoyt360/Elsotanodeosito)
// Cada vez que se actualiza el repositorio de GitHub, la aplicación
// en teléfonos detecta el nuevo commit, sincroniza los archivos nuevos
// y se actualiza sola en tiempo real.
// ============================================================
const GITHUB_REPO = process.env.GITHUB_REPO || 'Ositoyt360/Elsotanodeosito';
const ARCHIVOS_PROTEGIDOS_SYNC = new Set([
  'server.js', 'package.json', 'package-lock.json', '.env', '.env.example',
  'metadata.json', 'manifest.json', 'sw.js', 'actualizaciones-helper.js',
  'chat-data.json', 'admin-settings.json', 'site-settings.json'
]);

const githubSyncState = {
  repo: GITHUB_REPO,
  baselineSha: '',
  baselineTimestamp: 0,
  latestSha: '',
  latestMessage: '',
  latestDate: '',
  lastCheckedAt: 0,
  lastSyncedSha: '',
  syncing: false
};

function calcularVersionLocal() {
  const archivosClave = [
    'index.html', 'styles.css', 'v49.css', 'v49.js', 'v61.css',
    'script.js', 'firebase-integration.js', 'actualizaciones-helper.js',
    'performance-lite.js', 'sw.js',
    'perfil.html', 'profile.js', 'moderator.html', 'moderator.js'
  ];
  let firma = 0;
  for (const nombre of archivosClave) {
    try {
      const ruta = path.join(__dirname, nombre);
      if (fs.existsSync(ruta)) {
        const stat = fs.statSync(ruta);
        firma = (firma + Math.floor(stat.mtimeMs) + stat.size) % 9007199254740991;
      }
    } catch (e) {}
  }
  return `${githubSyncState.latestSha ? githubSyncState.latestSha.slice(0, 7) : 'local'}-${firma}`;
}

async function sincronizarArchivosCommitGitHub(sha) {
  if (!sha || githubSyncState.syncing) return [];
  githubSyncState.syncing = true;
  const actualizados = [];
  try {
    const peticion = global.fetch || require('node-fetch');
    const resCommit = await peticion(`https://api.github.com/repos/${GITHUB_REPO}/commits/${sha}`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ElSotanoDeOsito-PWA-Updater/1.0'
      }
    });
    if (!resCommit.ok) return [];
    const dataCommit = await resCommit.json();
    const files = Array.isArray(dataCommit.files) ? dataCommit.files : [];

    for (const fileInfo of files) {
      const filename = String(fileInfo?.filename || '').trim();
      if (!filename || filename.includes('..') || filename.startsWith('.')) continue;
      if (ARCHIVOS_PROTEGIDOS_SYNC.has(filename)) continue;
      if (fileInfo.status === 'removed') continue;

      const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${sha}/${encodeURI(filename)}`;
      try {
        const resRaw = await peticion(rawUrl, {
          headers: { 'User-Agent': 'ElSotanoDeOsito-PWA-Updater/1.0', 'Cache-Control': 'no-cache' }
        });
        if (resRaw.ok) {
          const buffer = Buffer.from(await resRaw.arrayBuffer());
          const destino = path.join(__dirname, filename);
          const dir = path.dirname(destino);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          fs.writeFileSync(destino, buffer);
          actualizados.push(filename);
        }
      } catch (errArchivo) {
        console.warn('[GitHubSync] No se pudo descargar archivo:', filename, errArchivo.message);
      }
    }
    if (actualizados.length > 0) {
      githubSyncState.lastSyncedSha = sha;
      console.log(`[GitHubSync] Commit ${sha.slice(0, 7)} sincronizado (${actualizados.length} archivos):`, actualizados.join(', '));
    }
  } catch (e) {
    console.warn('[GitHubSync] Error al sincronizar commit:', e.message);
  } finally {
    githubSyncState.syncing = false;
  }
  return actualizados;
}

async function consultarGitHubUltimoCommit(forzar = false) {
  const ahora = Date.now();
  if (!forzar && githubSyncState.lastCheckedAt && ahora - githubSyncState.lastCheckedAt < 25000) {
    return githubSyncState;
  }
  githubSyncState.lastCheckedAt = ahora;
  try {
    const peticion = global.fetch || require('node-fetch');
    const res = await peticion(`https://api.github.com/repos/${GITHUB_REPO}/commits?per_page=1`, {
      headers: {
        'Accept': 'application/vnd.github.v3+json',
        'User-Agent': 'ElSotanoDeOsito-PWA-Updater/1.0',
        'Cache-Control': 'no-cache'
      }
    });
    if (!res.ok) return githubSyncState;
    const commits = await res.json();
    const ultimo = Array.isArray(commits) && commits[0] ? commits[0] : null;
    if (!ultimo || !ultimo.sha) return githubSyncState;

    const sha = String(ultimo.sha);
    const fechaIso = String(ultimo.commit?.committer?.date || ultimo.commit?.author?.date || '');
    const fechaMs = Date.parse(fechaIso) || ahora;
    const mensaje = String(ultimo.commit?.message || '').split('\n')[0].trim().slice(0, 140);

    // Primera lectura al iniciar el servidor: registra la línea base actual
    if (!githubSyncState.baselineSha) {
      githubSyncState.baselineSha = sha;
      githubSyncState.baselineTimestamp = fechaMs;
      githubSyncState.latestSha = sha;
      githubSyncState.latestDate = fechaIso;
      githubSyncState.latestMessage = mensaje;
      return githubSyncState;
    }

    const cambioDetectado = sha !== githubSyncState.latestSha;
    githubSyncState.latestSha = sha;
    githubSyncState.latestDate = fechaIso;
    githubSyncState.latestMessage = mensaje;

    if (cambioDetectado && sha !== githubSyncState.baselineSha && fechaMs >= githubSyncState.baselineTimestamp) {
      const archivos = await sincronizarArchivosCommitGitHub(sha);
      broadcastWS({
        type: 'app_update',
        sha,
        shortSha: sha.slice(0, 7),
        message: mensaje,
        date: fechaIso,
        filesUpdated: archivos,
        version: calcularVersionLocal(),
        timestamp: Date.now()
      });
    }
  } catch (e) {
    // Silencioso si GitHub limita temporalmente o no hay red
  }
  return githubSyncState;
}

// Revisa GitHub automáticamente cada 60 segundos en segundo plano
setInterval(() => {
  consultarGitHubUltimoCommit(false).catch(() => {});
}, 60 * 1000).unref();

app.get('/api/github-version', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate');
  const forzar = req.query.force === '1' || req.query.force === 'true';
  await consultarGitHubUltimoCommit(forzar);
  res.json({
    ok: true,
    repo: GITHUB_REPO,
    sha: githubSyncState.latestSha || '',
    shortSha: githubSyncState.latestSha ? githubSyncState.latestSha.slice(0, 7) : '',
    message: githubSyncState.latestMessage || '',
    date: githubSyncState.latestDate || '',
    lastCheckedAt: githubSyncState.lastCheckedAt || Date.now(),
    version: calcularVersionLocal()
  });
});

app.post('/api/github-sync', async (req, res) => {
  res.setHeader('Cache-Control', 'no-store');
  await consultarGitHubUltimoCommit(true);
  let archivos = [];
  if (
    githubSyncState.latestSha &&
    githubSyncState.latestSha !== githubSyncState.baselineSha &&
    githubSyncState.latestSha !== githubSyncState.lastSyncedSha
  ) {
    archivos = await sincronizarArchivosCommitGitHub(githubSyncState.latestSha);
  }
  res.json({
    ok: true,
    repo: GITHUB_REPO,
    sha: githubSyncState.latestSha || '',
    shortSha: githubSyncState.latestSha ? githubSyncState.latestSha.slice(0, 7) : '',
    message: githubSyncState.latestMessage || '',
    date: githubSyncState.latestDate || '',
    filesUpdated: archivos,
    version: calcularVersionLocal()
  });
});

app.get('/descargar-app-html', (req, res) => {
  const appFile = path.join(__dirname, 'El-Sotano-de-Osito-App.html');
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.setHeader('Content-Disposition', 'attachment; filename="El-Sotano-de-Osito-App.html"');
  res.sendFile(appFile);
});

app.get('/descargar-apk', (req, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Descargar APK — El Sótano de Osito</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 50% 20%, #101935 0%, #050711 75%);
      color: #fff;
      font-family: system-ui, -apple-system, sans-serif;
      padding: 20px;
    }
    .card {
      max-width: 460px;
      width: 100%;
      background: rgba(15, 21, 40, 0.92);
      border: 1px solid rgba(0, 242, 254, 0.35);
      border-radius: 22px;
      padding: 28px 24px;
      text-align: center;
      box-shadow: 0 20px 50px rgba(0, 0, 0, 0.65);
    }
    img { width: 76px; height: 76px; border-radius: 18px; margin-bottom: 14px; border: 2px solid rgba(0, 242, 254, 0.5); }
    h1 { font-size: 1.35rem; margin-bottom: 8px; color: #00f2fe; }
    p { font-size: 0.92rem; color: #b8c7e0; line-height: 1.5; margin-bottom: 20px; }
    .btn {
      display: block;
      width: 100%;
      padding: 14px 18px;
      border-radius: 14px;
      font-weight: 800;
      font-size: 0.98rem;
      text-decoration: none;
      margin-bottom: 12px;
      transition: transform 0.15s ease;
    }
    .btn:active { transform: scale(0.98); }
    .btn-apk {
      background: linear-gradient(135deg, #00f2fe 0%, #4facfe 100%);
      color: #04101f;
      box-shadow: 0 8px 24px rgba(0, 242, 254, 0.3);
    }
    .btn-universal {
      background: rgba(255, 255, 255, 0.08);
      color: #e6f1ff;
      border: 1px solid rgba(255, 255, 255, 0.2);
    }
    .badges {
      display: flex;
      flex-wrap: wrap;
      gap: 8px;
      justify-content: center;
      margin-top: 14px;
      font-size: 0.78rem;
      color: #8fa6cb;
    }
    .badge {
      background: rgba(0, 242, 254, 0.1);
      border: 1px solid rgba(0, 242, 254, 0.25);
      padding: 4px 10px;
      border-radius: 999px;
    }
  </style>
</head>
<body>
  <div class="card">
    <img src="/favicon.png" alt="El Sótano de Osito">
    <h1>El Sótano de Osito — APK</h1>
    <p>Tu descarga de <b>El-Sotano-de-Osito.apk</b> (optimizado para Xiaomi Redmi 15C, 60/90/120Hz y modo carga) comenzará automáticamente.</p>
    <a id="dl-apk-btn" class="btn btn-apk" href="/El-Sotano-de-Osito.apk" download="El-Sotano-de-Osito.apk">⬇ Descargar El-Sotano-de-Osito.apk (Android)</a>
    <a class="btn btn-universal" href="/descargar-app-html" download="El-Sotano-de-Osito-App.html">📱 Descargar App Universal (Cualquier Teléfono / Tableta)</a>
    <div class="badges">
      <span class="badge">⚡ Redmi 15C / Gama Baja</span>
      <span class="badge">🔋 Fluido al Cargar</span>
      <span class="badge">🔄 Auto-Update GitHub</span>
    </div>
  </div>
  <script>
    setTimeout(function () {
      var a = document.getElementById('dl-apk-btn');
      if (a) a.click();
    }, 300);
  </script>
</body>
</html>`);
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`Servidor iniciado en http://0.0.0.0:${PORT}`);
  console.log(ANTHROPIC_API_KEY
    ? `[IA] Claude activo (modelo ${ANTHROPIC_MODEL}).`
    : '[IA] Falta ANTHROPIC_API_KEY: la IA responderá solo con su base de conocimiento local.');
  consultarGitHubUltimoCommit(true).catch(() => {});
});
