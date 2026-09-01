const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

const PORT = process.env.PORT || 3000;
const MAX_HISTORY = 100;
const users = new Map();
const messageHistory = [];

app.use(express.static(path.join(__dirname)));

function sanitizeNickname(input) {
  return String(input || '')
    .trim()
    .replace(/\s+/g, ' ')
    .slice(0, 24);
}

function formatTime(date = new Date()) {
  return date.toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function currentUsers() {
  return Array.from(users.values()).sort((a, b) =>
    a.name.localeCompare(b.name, 'es', { sensitivity: 'base' })
  );
}

function emitUserState() {
  io.emit('users-update', {
    count: users.size,
    users: currentUsers(),
  });
}

function addHistory(entry) {
  messageHistory.push(entry);
  if (messageHistory.length > MAX_HISTORY) {
    messageHistory.splice(0, messageHistory.length - MAX_HISTORY);
  }
}

io.on('connection', (socket) => {
  socket.on('join-chat', (rawNickname) => {
    const nickname = sanitizeNickname(rawNickname);

    if (!nickname) {
      socket.emit('join-error', {
        message: 'Debes escribir un apodo para entrar al chat.',
      });
      return;
    }

    users.set(socket.id, {
      id: socket.id,
      name: nickname,
    });

    socket.emit('user-registered', {
      id: socket.id,
      name: nickname,
      history: messageHistory,
    });

    socket.broadcast.emit('system-message', {
      text: `${nickname} se unió al chat.`,
      time: formatTime(),
    });

    emitUserState();
  });

  socket.on('send-message', (rawText) => {
    const user = users.get(socket.id);
    if (!user) return;

    const text = String(rawText || '').trim().slice(0, 500);
    if (!text) return;

    const message = {
      id: `${socket.id}-${Date.now()}`,
      userId: socket.id,
      username: user.name,
      text,
      time: formatTime(),
    };

    addHistory(message);
    io.emit('receive-message', message);
  });

  socket.on('disconnect', () => {
    const user = users.get(socket.id);
    if (!user) return;

    users.delete(socket.id);
    io.emit('system-message', {
      text: `${user.name} salió del chat.`,
      time: formatTime(),
    });
    emitUserState();
  });
});

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

server.listen(PORT, () => {
  console.log(`Chat en vivo listo en http://localhost:${PORT}`);
});
