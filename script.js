document.addEventListener('DOMContentLoaded', () => {
  const socket = io();

  const nicknameModal = document.getElementById('nickname-modal');
  const nicknameForm = document.getElementById('nickname-form');
  const nicknameInput = document.getElementById('nickname-input');
  const nicknameError = document.getElementById('nickname-error');

  const messagesEl = document.getElementById('messages');
  const messageForm = document.getElementById('message-form');
  const messageInput = document.getElementById('message-input');
  const sendButton = document.getElementById('send-button');

  const usersList = document.getElementById('users-list');
  const usersCount = document.getElementById('users-count');
  const connectionStatus = document.getElementById('connection-status');
  const welcomeNote = document.getElementById('welcome-note');

  let joined = false;
  let myNickname = '';

  const savedNickname = localStorage.getItem('livechat:nickname');
  if (savedNickname) {
    nicknameInput.value = savedNickname;
  }

  function setStatus(text, tone = 'neutral') {
    connectionStatus.textContent = text;
    connectionStatus.dataset.tone = tone;
  }

  function setError(text = '') {
    nicknameError.textContent = text;
  }

  function enableChat() {
    messageInput.disabled = false;
    sendButton.disabled = false;
    messageInput.focus();
  }

  function disableChat() {
    messageInput.disabled = true;
    sendButton.disabled = true;
  }

  function shouldStickToBottom() {
    const threshold = 100;
    return messagesEl.scrollHeight - messagesEl.scrollTop - messagesEl.clientHeight < threshold;
  }

  function scrollToBottom(force = false) {
    if (force || shouldStickToBottom()) {
      messagesEl.scrollTop = messagesEl.scrollHeight;
    }
  }

  function clearEmptyState() {
    const empty = messagesEl.querySelector('.empty-state');
    if (empty) empty.remove();
  }

  function showEmptyState() {
    messagesEl.innerHTML = `
      <div class="empty-state">
        <h3>Aún no hay mensajes</h3>
        <p>Cuando alguien escriba algo, aparecerá aquí al instante.</p>
      </div>
    `;
  }

  function createMessageCard({ username, text, time, kind = 'message', mine = false }) {
    clearEmptyState();

    const article = document.createElement('article');
    article.className = `message-card ${kind}${mine ? ' mine' : ''}`;

    const meta = document.createElement('div');
    meta.className = 'message-meta';

    const name = document.createElement('strong');
    name.className = 'message-name';
    name.textContent = username;

    const clock = document.createElement('span');
    clock.className = 'message-time';
    clock.textContent = time || '';

    meta.append(name, clock);

    const body = document.createElement('p');
    body.className = 'message-text';
    body.textContent = text;

    article.append(meta, body);
    messagesEl.appendChild(article);
  }

  function renderSystemMessage(payload) {
    createMessageCard({
      username: 'Sistema',
      text: payload.text,
      time: payload.time,
      kind: 'system',
    });
    scrollToBottom();
  }

  function renderChatMessage(payload) {
    const mine = joined && payload.username === myNickname;
    createMessageCard({
      username: payload.username,
      text: payload.text,
      time: payload.time,
      kind: 'message',
      mine,
    });
    scrollToBottom();
  }

  function renderUsers(payload) {
    const count = payload?.count ?? 0;
    const users = payload?.users ?? [];

    usersCount.textContent = String(count);
    usersList.innerHTML = '';

    if (!users.length) {
      const li = document.createElement('li');
      li.className = 'users-empty';
      li.textContent = 'Nadie conectado todavía';
      usersList.appendChild(li);
      return;
    }

    users.forEach((user) => {
      const li = document.createElement('li');
      li.className = 'user-item';
      li.textContent = user.name;
      usersList.appendChild(li);
    });
  }

  function joinChat() {
    const nickname = nicknameInput.value.trim().slice(0, 24);

    if (!nickname) {
      setError('Escribe un apodo para entrar.');
      nicknameInput.focus();
      return;
    }

    setError('');
    socket.emit('join-chat', nickname);
  }

  nicknameForm.addEventListener('submit', (event) => {
    event.preventDefault();
    joinChat();
  });

  messageForm.addEventListener('submit', (event) => {
    event.preventDefault();

    const text = messageInput.value.trim();
    if (!text || !joined) return;

    socket.emit('send-message', text);
    messageInput.value = '';
    messageInput.focus();
  });

  socket.on('connect', () => {
    setStatus('Conectado', 'online');
    if (joined && myNickname) {
      disableChat();
      socket.emit('join-chat', myNickname);
    }
  });

  socket.on('disconnect', () => {
    setStatus('Reconectando...', 'offline');
    disableChat();
  });

  socket.on('connect_error', () => {
    setStatus('Error de conexión', 'error');
  });

  socket.on('join-error', (payload) => {
    setError(payload?.message || 'No se pudo entrar al chat.');
  });

  socket.on('user-registered', (payload) => {
    joined = true;
    myNickname = payload.name;
    localStorage.setItem('livechat:nickname', myNickname);

    nicknameModal.classList.add('hidden');
    enableChat();

    welcomeNote.textContent = `Conectado como ${myNickname}. Ya puedes escribir mensajes.`;

    messagesEl.innerHTML = '';
    if (Array.isArray(payload.history) && payload.history.length > 0) {
      payload.history.forEach((entry) => {
        renderChatMessage(entry);
      });
    } else {
      showEmptyState();
    }

    scrollToBottom(true);
  });

  socket.on('receive-message', (payload) => {
    renderChatMessage(payload);
  });

  socket.on('system-message', (payload) => {
    renderSystemMessage(payload);
  });

  socket.on('users-update', renderUsers);

  if (savedNickname) {
    welcomeNote.textContent = `Tu último apodo guardado fue ${savedNickname}.`;
  }

  disableChat();
  nicknameInput.focus();
});
