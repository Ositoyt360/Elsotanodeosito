        (function(){
            const aiMessages = document.getElementById('ai-messages');
            const aiForm = document.getElementById('ai-form');
            const aiInput = document.getElementById('ai-input');
            const aiSuggestions = document.querySelectorAll('.ai-suggestion');
            const aiGenderBtns = document.querySelectorAll('.ai-gender-btn');
            const aiVoiceToggle = document.getElementById('ai-voice-toggle'); 
            let ultimaRespuestaIA = '';
            let turnoIA = 0;
            let aiGenero = localStorage.getItem('osito_ai_genero') || 'female';
            if (!localStorage.getItem('osito_ai_genero')) {
                localStorage.setItem('osito_ai_genero', 'female');
            }
            // Nota: para cuentas registradas, el género real (elegido al registrarse)
            // llega un poco después vía firebase-integration.js y el evento
            // 'osito:firebase-auth-ready'. Por eso NO se fuerza aquí ningún valor
            // por defecto: hacerlo pisaba el género real y dejaba los botones
            // Osito/Osita bloqueados sin motivo.
            let aiNombre = localStorage.getItem('osito_ai_nombre') || '';
            const aiNameInput = document.getElementById('ai-name-input');
            const aiNameSave = document.getElementById('ai-name-save');
            let vozActiva = localStorage.getItem('osito_ai_voz') !== 'false';
            let bienvenidaReproducida = false;
            const bienvenidaSitio = 'Bienvenido al Sótano de Osito. Aquí puedes ver videos recientes, directos, canciones, favoritos, novedades en vivo y hablar con la inteligencia del sitio. Tu cuenta se guarda en Firebase para que puedas entrar sin repetir el registro y mantener tu chat e historial. Puedes preguntarme lo que quieras y también cambiar mi nombre cuando quieras.';

            const infoCanal = {
                canal: 'OsitoGamer360YT',
                cumpleCanal: { mes: 5, dia: 2, anioInicio: 2022 },
                cumpleCreador: { mes: 8, dia: 28, anio: 2008 },
                pais: 'El Salvador',
                contenido: 'videojuegos de todo tipo, especialmente Minecraft, Roblox, Free Fire, Craftman/Craftsman, gameplays, directos, shorts y series',
                favoritos: 'Minecraft, Roblox y Craftman/Craftsman',
                origen: 'el nombre Osito viene de un peluche que empezo en 2019, cuando se grababa con un panda chiquito de peluche',
                inspiracion: 'Max Wish, Los Compas y Mikecrack',
                editor: 'Santiago',
                serie: 'Survivalang',
                logro: 'llegar a 1000 suscriptores',
                videoFavorito: 'un vlog armando el arbol de Navidad',
                colaborador: 'Allay MC',
                reglasDirectos: 'no insultos, no humillar a la gente y mantener todo humildemente',
                meta: 'terminar sus estudios, seguir con el canal y hacer crecer mas la comunidad'
            };

            function normalizarPreguntaIA(value) {
                return String(value || '')
                    .normalize('NFD')
                    .split('')
                    .filter((char) => {
                        const code = char.charCodeAt(0);
                        return code < 0x300 || code > 0x36f;
                    })
                    .join('')
                    .toLowerCase();
            }

            function esEquipoGamaBajaIA() {
                const h = document.documentElement.classList;
                const b = document.body.classList;
                return h.contains('low-end-device') || h.contains('mobile-lite') || h.contains('perf-lite') ||
                       h.contains('fps-drop') || h.contains('redmi-fluid-mode') || h.contains('charging-fluid-mode') ||
                       b.contains('no-animations') || b.contains('ultra-performance');
            }

            let scrollRafPendiente = 0;
            function desplazarChatSuave() {
                if (!aiMessages || scrollRafPendiente || window.ositoEnLlamadaIA) return;
                scrollRafPendiente = requestAnimationFrame(() => {
                    scrollRafPendiente = 0;
                    aiMessages.scrollTop = aiMessages.scrollHeight;
                });
            }

            // =========================================================================
            // HISTORIAL DE CONVERSACIONES ESTILO CHATGPT (localStorage + Firestore)
            // =========================================================================
            const SESSIONS_STORAGE_KEY = 'osito_ai_sessions_v2';
            const ACTIVE_SESSION_KEY = 'osito_ai_active_session_v2';
            const MAX_SESSIONS_GUARDADAS = 35;
            const MAX_MSGS_POR_SESION = 60;

            const historyToggleBtn = document.getElementById('ai-history-toggle-btn');
            const historyCountBadge = document.getElementById('ai-history-count-badge');
            const currentChatTitleEl = document.getElementById('ai-current-chat-title');
            const newChatBtn = document.getElementById('ai-new-chat-btn');
            const sessionsDrawer = document.getElementById('ai-sessions-drawer');
            const sessionsListEl = document.getElementById('ai-sessions-list');
            const sessionsClearBtn = document.getElementById('ai-sessions-clear-btn');
            const sessionsCloseBtn = document.getElementById('ai-sessions-close-btn');

            const micConfigToggle = document.getElementById('ai-mic-config-toggle');
            const micConfigPanel = document.getElementById('ai-mic-config-panel');
            const micConfigClose = document.getElementById('ai-mic-config-close');
            const cfgAntiRepeat = document.getElementById('ai-cfg-antirepeat');
            const sidebarAntiRepeat = document.getElementById('sidebar-mic-antirepeat');
            const cfgSilenceMs = document.getElementById('ai-cfg-silence-ms');
            const cfgVoiceRate = document.getElementById('ai-cfg-voice-rate');

            function esMensajeObsoletoPrivacidad(texto) {
                const t = String(texto || '').toLowerCase();
                return t.includes('sobre la vida privada de osito solo comparto') || t.includes('esto encontre sobre rosebud');
            }

            function generarTituloAutomaticoChat(textoUsuario) {
                const limpio = String(textoUsuario || '')
                    .replace(/^[¡!¿?\s.,;:]+|[¡!¿?\s.,;:]+$/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                if (!limpio) return 'Conversación con la IA';
                const quitarPrefijo = limpio
                    .replace(/^(hola|buenas|oye|osito|osita|mascotita|dime|cuentame|explicame|una pregunta|quiero saber|por favor)\s+/i, '')
                    .trim() || limpio;
                const capitalizado = quitarPrefijo.charAt(0).toUpperCase() + quitarPrefijo.slice(1);
                return capitalizado.length > 38 ? capitalizado.slice(0, 36).trim() + '…' : capitalizado;
            }

            function leerSesionesLocales() {
                try {
                    const raw = localStorage.getItem(SESSIONS_STORAGE_KEY);
                    if (!raw) return [];
                    const parsed = JSON.parse(raw);
                    if (!Array.isArray(parsed)) return [];
                    return parsed.map((s) => ({
                        id: String(s?.id || ''),
                        title: String(s?.title || 'Nuevo chat').slice(0, 60),
                        createdAt: Number(s?.createdAt) || Date.now(),
                        updatedAt: Number(s?.updatedAt) || Date.now(),
                        messages: (Array.isArray(s?.messages) ? s.messages : [])
                            .filter((m) => m && m.text && !esMensajeObsoletoPrivacidad(m.text))
                            .slice(-MAX_MSGS_POR_SESION)
                    })).filter((s) => s.id);
                } catch (e) {
                    return [];
                }
            }

            let sesionesChat = leerSesionesLocales();
            let sesionActivaId = localStorage.getItem(ACTIVE_SESSION_KEY) || '';

            function guardarSesionesLocales() {
                try {
                    if (sesionesChat.length > MAX_SESSIONS_GUARDADAS) {
                        sesionesChat.sort((a, b) => b.updatedAt - a.updatedAt);
                        sesionesChat = sesionesChat.slice(0, MAX_SESSIONS_GUARDADAS);
                    }
                    localStorage.setItem(SESSIONS_STORAGE_KEY, JSON.stringify(sesionesChat));
                    if (sesionActivaId) {
                        localStorage.setItem(ACTIVE_SESSION_KEY, sesionActivaId);
                    }
                } catch (e) {}
            }

            function obtenerOCrearSesionActiva() {
                let actual = sesionesChat.find((s) => s.id === sesionActivaId);
                if (!actual) {
                    if (sesionesChat.length > 0) {
                        sesionesChat.sort((a, b) => b.updatedAt - a.updatedAt);
                        actual = sesionesChat[0];
                        sesionActivaId = actual.id;
                    } else {
                        actual = {
                            id: 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                            title: 'Nuevo chat',
                            createdAt: Date.now(),
                            updatedAt: Date.now(),
                            messages: []
                        };
                        sesionesChat.unshift(actual);
                        sesionActivaId = actual.id;
                    }
                    guardarSesionesLocales();
                }
                return actual;
            }

            function formatearFechaCortaSesion(ts) {
                try {
                    const ahora = new Date();
                    const fecha = new Date(ts || Date.now());
                    const esHoy = ahora.toDateString() === fecha.toDateString();
                    if (esHoy) {
                        return 'Hoy · ' + fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
                    }
                    return fecha.toLocaleDateString('es-SV', { day: '2-digit', month: 'short' }) + ' · ' +
                        fecha.toLocaleTimeString('es-SV', { hour: '2-digit', minute: '2-digit' });
                } catch (e) {
                    return 'Reciente';
                }
            }

            function actualizarCabeceraYListaSesiones() {
                const activa = obtenerOCrearSesionActiva();
                if (currentChatTitleEl) {
                    currentChatTitleEl.textContent = '💬 ' + (activa.title || 'Nuevo chat');
                }
                const conMensajes = sesionesChat.filter((s) => s.messages && s.messages.length > 0);
                const totalMostrar = Math.max(1, conMensajes.length || sesionesChat.length);
                if (historyCountBadge) {
                    historyCountBadge.textContent = String(totalMostrar);
                }
                if (!sessionsListEl) return;

                sessionsListEl.replaceChildren();
                const ordenadas = [...sesionesChat].sort((a, b) => b.updatedAt - a.updatedAt);
                ordenadas.forEach((sesion) => {
                    const item = document.createElement('div');
                    item.className = 'ai-session-item' + (sesion.id === sesionActivaId ? ' active' : '');
                    item.setAttribute('role', 'listitem');

                    const mainBtn = document.createElement('button');
                    mainBtn.type = 'button';
                    mainBtn.className = 'ai-session-select-btn';
                    const ultimoMsg = sesion.messages && sesion.messages.length
                        ? sesion.messages[sesion.messages.length - 1].text
                        : 'Sin mensajes todavía';
                    const preview = String(ultimoMsg || '').slice(0, 54) + (String(ultimoMsg || '').length > 54 ? '…' : '');
                    mainBtn.innerHTML =
                        `<div class="ai-session-item-top">` +
                            `<span class="ai-session-item-title">${ (sesion.title || 'Nuevo chat').replace(/</g, '&lt;') }</span>` +
                            `<span class="ai-session-item-date">${ formatearFechaCortaSesion(sesion.updatedAt) }</span>` +
                        `</div>` +
                        `<div class="ai-session-item-preview">${ preview.replace(/</g, '&lt;') } (${ sesion.messages.length } msj)</div>`;
                    mainBtn.addEventListener('click', () => {
                        cambiarASesionChat(sesion.id);
                        toggleDrawerHistorial(false);
                    });

                    const delBtn = document.createElement('button');
                    delBtn.type = 'button';
                    delBtn.className = 'ai-session-delete-btn';
                    delBtn.title = 'Eliminar esta conversación';
                    delBtn.setAttribute('aria-label', 'Eliminar conversación');
                    delBtn.textContent = '✕';
                    delBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        eliminarSesionChat(sesion.id);
                    });

                    item.appendChild(mainBtn);
                    item.appendChild(delBtn);
                    sessionsListEl.appendChild(item);
                });
            }

            function renderizarMensajesSesionActiva() {
                if (!aiMessages) return;
                const activa = obtenerOCrearSesionActiva();
                aiMessages.replaceChildren();

                const msgBienvenida = document.createElement('div');
                msgBienvenida.className = 'msg bot';
                const esInvitado = typeof window.osEsInvitado === 'function' ? window.osEsInvitado() : true;
                if (esInvitado && !aiGenero) {
                    msgBienvenida.textContent = '🤖 Identidad requerida: ¿Eres Osito o Osita?';
                } else {
                    msgBienvenida.textContent = `🤖 ¡Qué onda, ${prefijoIA()}! Pregúntame lo que quieras o retoma cualquier tema.`;
                }
                aiMessages.appendChild(msgBienvenida);

                (activa.messages || []).forEach((m) => {
                    if (!m || !m.text || esMensajeObsoletoPrivacidad(m.text)) return;
                    const div = document.createElement('div');
                    div.className = `msg ${m.role === 'user' ? 'user' : 'bot'} ia-msg-complete`;
                    if (m.role === 'user') {
                        const span = document.createElement('span');
                        span.className = 'ia-msg-user-text';
                        span.textContent = m.text;
                        div.appendChild(span);
                    } else {
                        const bodySpan = document.createElement('span');
                        bodySpan.className = 'ia-msg-body';
                        bodySpan.textContent = m.text;
                        const waveSpan = document.createElement('span');
                        waveSpan.className = 'ia-msg-wave';
                        waveSpan.setAttribute('aria-hidden', 'true');
                        waveSpan.innerHTML = '<i></i><i></i><i></i><i></i>';
                        div.appendChild(bodySpan);
                        div.appendChild(waveSpan);
                    }
                    aiMessages.appendChild(div);
                });
                desplazarChatSuave();
            }

            function iniciarNuevoChatIA() {
                const actual = obtenerOCrearSesionActiva();
                // Si el chat actual ya está vacío, solo limpiamos la vista y cerramos el cajón
                if (!actual.messages || actual.messages.length === 0) {
                    actual.title = 'Nuevo chat';
                    actual.updatedAt = Date.now();
                    guardarSesionesLocales();
                    renderizarMensajesSesionActiva();
                    actualizarCabeceraYListaSesiones();
                    if (aiInput && !aiInput.disabled) aiInput.focus();
                    return;
                }
                const nueva = {
                    id: 'chat_' + Date.now() + '_' + Math.random().toString(36).slice(2, 7),
                    title: 'Nuevo chat',
                    createdAt: Date.now(),
                    updatedAt: Date.now(),
                    messages: []
                };
                sesionesChat.unshift(nueva);
                sesionActivaId = nueva.id;
                guardarSesionesLocales();
                renderizarMensajesSesionActiva();
                actualizarCabeceraYListaSesiones();
                if (aiInput && !aiInput.disabled) aiInput.focus();
            }

            function cambiarASesionChat(id) {
                const encontrada = sesionesChat.find((s) => s.id === id);
                if (!encontrada) return;
                sesionActivaId = encontrada.id;
                guardarSesionesLocales();
                renderizarMensajesSesionActiva();
                actualizarCabeceraYListaSesiones();
            }

            function eliminarSesionChat(id) {
                sesionesChat = sesionesChat.filter((s) => s.id !== id);
                if (sesionActivaId === id) {
                    sesionActivaId = sesionesChat[0]?.id || '';
                }
                obtenerOCrearSesionActiva();
                guardarSesionesLocales();
                renderizarMensajesSesionActiva();
                actualizarCabeceraYListaSesiones();
            }

            function toggleDrawerHistorial(forzar) {
                if (!sessionsDrawer) return;
                const abrir = typeof forzar === 'boolean' ? forzar : sessionsDrawer.hidden;
                sessionsDrawer.hidden = !abrir;
                if (historyToggleBtn) {
                    historyToggleBtn.setAttribute('aria-expanded', abrir ? 'true' : 'false');
                    historyToggleBtn.classList.toggle('active', abrir);
                }
                const chatShell = document.getElementById('ai-chat-shell');
                if (chatShell) {
                    const elsToHide = chatShell.querySelectorAll('.ai-profile-row, .ia-messages, .ai-suggestions, .ai-image-preview-bar, #ai-form, .ai-voice-status');
                    elsToHide.forEach(el => {
                        el.style.display = abrir ? 'none' : '';
                    });
                    chatShell.classList.toggle('history-drawer-active', abrir);
                }
                if (abrir) actualizarCabeceraYListaSesiones();
            }

            // Construye un resumen compacto de conversaciones anteriores y de la sesión actual para que la IA tenga memoria estilo ChatGPT
            function construirMemoriaGlobalChats() {
                const fragmentos = [];
                const ordenadas = [...sesionesChat].sort((a, b) => b.updatedAt - a.updatedAt);
                for (const s of ordenadas.slice(0, 6)) {
                    if (!s.messages || !s.messages.length) continue;
                    const ultimosUsuario = s.messages
                        .filter((m) => m.role === 'user' && m.text)
                        .slice(-3)
                        .map((m) => m.text.slice(0, 70))
                        .join(' / ');
                    if (ultimosUsuario) {
                        fragmentos.push(`[Chat "${s.title}": ${ultimosUsuario}]`);
                    }
                }
                return fragmentos.join(' ').slice(0, 650);
            }

            function obtenerHistorialSesionActivaParaAPI(preguntaActual) {
                const activa = obtenerOCrearSesionActiva();
                const lista = (activa.messages || []).map((m) => ({
                    role: m.role === 'user' ? 'user' : 'assistant',
                    text: String(m.text || '').trim()
                })).filter((m) => m.text && !esMensajeObsoletoPrivacidad(m.text));
                const ultimo = lista[lista.length - 1];
                if (ultimo && ultimo.role === 'user' && ultimo.text === preguntaActual) {
                    lista.pop();
                }
                return lista.slice(-16);
            }

            function registrarMensajeEnSesionLocal(role, texto) {
                const limpio = String(texto || '').trim();
                if (!limpio || /^🤖\s*identidad requerida/i.test(limpio) || esMensajeObsoletoPrivacidad(limpio)) return null;
                const activa = obtenerOCrearSesionActiva();
                if (!Array.isArray(activa.messages)) activa.messages = [];

                // Evitar duplicado exacto consecutivo del mismo rol en el mismo segundo
                const ultimo = activa.messages[activa.messages.length - 1];
                if (ultimo && ultimo.role === role && ultimo.text === limpio && (Date.now() - (ultimo.ts || 0)) < 1500) {
                    return activa;
                }

                if (role === 'user' && (!activa.title || activa.title === 'Nuevo chat')) {
                    const tieneUsuarioPrevio = activa.messages.some((m) => m.role === 'user');
                    if (!tieneUsuarioPrevio && !/^(hola|buenas|hey|que onda|osito|osita)$/i.test(limpio)) {
                        activa.title = generarTituloAutomaticoChat(limpio);
                    } else if (tieneUsuarioPrevio) {
                        activa.title = generarTituloAutomaticoChat(limpio);
                    }
                }

                activa.messages.push({
                    role: role === 'user' ? 'user' : 'bot',
                    text: limpio,
                    ts: Date.now()
                });
                if (activa.messages.length > MAX_MSGS_POR_SESION) {
                    activa.messages = activa.messages.slice(-MAX_MSGS_POR_SESION);
                }
                activa.updatedAt = Date.now();
                guardarSesionesLocales();
                actualizarCabeceraYListaSesiones();
                return activa;
            }

            // Recibe historial de Firestore sin borrar ni interrumpir la conversación en vivo
            function recibirMensajesRemotosFirestore(remotos) {
                if (!Array.isArray(remotos) || !remotos.length) return;
                const limpios = remotos.filter((m) => m && m.text && !esMensajeObsoletoPrivacidad(m.text));
                if (!limpios.length) return;

                let huboCambios = false;
                const porSesion = new Map();
                limpios.forEach((m) => {
                    const sid = m.sessionId || 'chat_cloud_historial';
                    if (!porSesion.has(sid)) {
                        porSesion.set(sid, {
                            title: m.sessionTitle || '',
                            items: []
                        });
                    }
                    const grupo = porSesion.get(sid);
                    if (m.sessionTitle && !grupo.title) grupo.title = m.sessionTitle;
                    grupo.items.push({
                        role: m.role === 'user' ? 'user' : 'bot',
                        text: String(m.text || '').trim(),
                        ts: Number(m.timestamp) || Date.now()
                    });
                });

                porSesion.forEach((grupo, sid) => {
                    let existente = sesionesChat.find((s) => s.id === sid);
                    if (!existente) {
                        const primerUser = grupo.items.find((x) => x.role === 'user');
                        existente = {
                            id: sid,
                            title: grupo.title || (primerUser ? generarTituloAutomaticoChat(primerUser.text) : 'Conversación guardada'),
                            createdAt: grupo.items[0]?.ts || Date.now(),
                            updatedAt: grupo.items[grupo.items.length - 1]?.ts || Date.now(),
                            messages: grupo.items.slice(-MAX_MSGS_POR_SESION)
                        };
                        sesionesChat.push(existente);
                        huboCambios = true;
                    } else if (grupo.items.length > existente.messages.length) {
                        existente.messages = grupo.items.slice(-MAX_MSGS_POR_SESION);
                        if (grupo.title && existente.title === 'Nuevo chat') existente.title = grupo.title;
                        huboCambios = true;
                    }
                });

                if (huboCambios) {
                    guardarSesionesLocales();
                    const activa = obtenerOCrearSesionActiva();
                    const estaEscribiendo = Boolean(aiMessages && aiMessages.querySelector('.typing, .ia-streaming'));
                    if (!estaEscribiendo && aiMessages && aiMessages.children.length <= 1 && activa.messages.length > 0) {
                        renderizarMensajesSesionActiva();
                    }
                    actualizarCabeceraYListaSesiones();
                }
            }

            window.OsitoChatHistory = {
                iniciarNuevoChat: iniciarNuevoChatIA,
                cambiarASesion: cambiarASesionChat,
                recibirMensajesRemotos: recibirMensajesRemotosFirestore,
                construirMemoriaGlobal: construirMemoriaGlobalChats
            };

            if (historyToggleBtn) {
                historyToggleBtn.addEventListener('click', () => toggleDrawerHistorial());
            }
            if (sessionsCloseBtn) {
                sessionsCloseBtn.addEventListener('click', () => toggleDrawerHistorial(false));
            }
            if (newChatBtn) {
                newChatBtn.addEventListener('click', () => {
                    toggleDrawerHistorial(false);
                    iniciarNuevoChatIA();
                });
            }
            if (sessionsClearBtn) {
                sessionsClearBtn.addEventListener('click', () => {
                    sesionesChat = [];
                    sesionActivaId = '';
                    obtenerOCrearSesionActiva();
                    guardarSesionesLocales();
                    renderizarMensajesSesionActiva();
                    actualizarCabeceraYListaSesiones();
                    toggleDrawerHistorial(false);
                });
            }

            // Enlaces de Configuración de Micrófono y Voz
            function sincronizarControlesVoz() {
                const antiRep = localStorage.getItem('osito_mic_anti_repeat') !== 'false';
                const silMs = localStorage.getItem('osito_mic_silence_ms') || '1050';
                const vRate = localStorage.getItem('osito_ai_voice_rate') || '1.0';
                if (cfgAntiRepeat) cfgAntiRepeat.checked = antiRep;
                if (sidebarAntiRepeat) sidebarAntiRepeat.checked = antiRep;
                if (cfgSilenceMs) cfgSilenceMs.value = silMs;
                if (cfgVoiceRate) cfgVoiceRate.value = vRate;
            }
            sincronizarControlesVoz();

            const iaCfgHeaderBtn = document.getElementById('ia-cfg-header-btn');
            function togglePanelConfiguracionVoz() {
                if (!micConfigPanel) return;
                const abrir = micConfigPanel.hidden;
                micConfigPanel.hidden = !abrir;
                if (micConfigToggle) {
                    micConfigToggle.classList.toggle('active', abrir);
                    micConfigToggle.setAttribute('aria-expanded', abrir ? 'true' : 'false');
                }
                if (iaCfgHeaderBtn) {
                    iaCfgHeaderBtn.classList.toggle('active', abrir);
                }
                if (abrir) {
                    sincronizarVocesSistema();
                }
            }
            if (micConfigToggle) {
                micConfigToggle.addEventListener('click', togglePanelConfiguracionVoz);
            }
            if (iaCfgHeaderBtn) {
                iaCfgHeaderBtn.addEventListener('click', togglePanelConfiguracionVoz);
            }
            if (micConfigClose && micConfigPanel) {
                micConfigClose.addEventListener('click', () => {
                    micConfigPanel.hidden = true;
                    if (micConfigToggle) {
                        micConfigToggle.classList.remove('active');
                        micConfigToggle.setAttribute('aria-expanded', 'false');
                    }
                    if (iaCfgHeaderBtn) {
                        iaCfgHeaderBtn.classList.remove('active');
                    }
                });
            }
            if (cfgAntiRepeat) {
                cfgAntiRepeat.addEventListener('change', () => {
                    localStorage.setItem('osito_mic_anti_repeat', cfgAntiRepeat.checked ? 'true' : 'false');
                    if (sidebarAntiRepeat) sidebarAntiRepeat.checked = cfgAntiRepeat.checked;
                });
            }
            if (sidebarAntiRepeat) {
                sidebarAntiRepeat.addEventListener('change', () => {
                    localStorage.setItem('osito_mic_anti_repeat', sidebarAntiRepeat.checked ? 'true' : 'false');
                    if (cfgAntiRepeat) cfgAntiRepeat.checked = sidebarAntiRepeat.checked;
                });
            }
            if (cfgSilenceMs) {
                cfgSilenceMs.addEventListener('change', () => {
                    localStorage.setItem('osito_mic_silence_ms', cfgSilenceMs.value);
                });
            }
            if (cfgVoiceRate) {
                cfgVoiceRate.addEventListener('change', () => {
                    localStorage.setItem('osito_ai_voice_rate', cfgVoiceRate.value);
                    if (typeof showToast === 'function') showToast(`Velocidad de voz ajustada a ${cfgVoiceRate.value}x 🔊✨`);
                });
            }

            const cfgVoiceSelect = document.getElementById('ai-cfg-voice-select');
            function sincronizarVocesSistema() {
                if (window.OsitoVozHumana && typeof window.OsitoVozHumana.poblarVocesDisponibles === 'function' && cfgVoiceSelect) {
                    window.OsitoVozHumana.poblarVocesDisponibles(cfgVoiceSelect);
                }
            }
            if ('speechSynthesis' in window) {
                window.speechSynthesis.onvoiceschanged = sincronizarVocesSistema;
                setTimeout(sincronizarVocesSistema, 150);
                setTimeout(sincronizarVocesSistema, 600);
                setTimeout(sincronizarVocesSistema, 1500);
            }
            // También sincronizar de inmediato
            sincronizarVocesSistema();

            if (cfgVoiceSelect) {
                cfgVoiceSelect.addEventListener('change', () => {
                    localStorage.setItem('osito_ai_selected_voice_name', cfgVoiceSelect.value);
                    if (window.OsitoVozHumana && typeof window.OsitoVozHumana.obtenerMejorVoz === 'function') {
                        window.OsitoVozHumana.obtenerMejorVoz();
                    }
                    if (typeof showToast === 'function') showToast('¡Voz de la IA guardada con éxito! 👩🔊✨');
                    if (window.OsitoVozHumana && typeof window.OsitoVozHumana.hablar === 'function') {
                        window.OsitoVozHumana.hablar('¡Hola! Esta es mi nueva voz para platicar contigo en El Sótano de Osito.');
                    }
                });
            }

            function agregarMensajeIA(texto, tipo, imagenAdjunta = '', guardarEnHistorial = true) {
                if (!aiMessages) return;
                const enLlamada = Boolean(window.ositoEnLlamadaIA);
                const msg = document.createElement('div');
                msg.className = enLlamada ? `msg ${tipo}` : `msg ${tipo} ia-msg-enter`;

                if (tipo === 'bot') {
                    const bodySpan = document.createElement('span');
                    bodySpan.className = 'ia-msg-body';
                    const waveSpan = document.createElement('span');
                    waveSpan.className = 'ia-msg-wave';
                    waveSpan.setAttribute('aria-hidden', 'true');
                    waveSpan.innerHTML = '<i></i><i></i><i></i><i></i>';

                    msg.appendChild(bodySpan);
                    msg.appendChild(waveSpan);
                    aiMessages.appendChild(msg);

                    const callSub = document.getElementById('ia-call-subtitle');
                    if (callSub && enLlamada) {
                        callSub.textContent = texto;
                    }

                    const modoLigero = esEquipoGamaBajaIA() || enLlamada;
                    const palabras = String(texto || '').split(' ');
                    if (modoLigero || palabras.length <= 4) {
                        bodySpan.textContent = texto;
                        msg.classList.add('ia-msg-complete');
                        if (!enLlamada) desplazarChatSuave();
                    } else {
                        msg.classList.add('ia-streaming');
                        bodySpan.textContent = '';
                        let idx = 0;
                        let pasoNum = 0;
                        const paso = Math.max(3, Math.ceil(palabras.length / 10));
                        const timerStream = setInterval(() => {
                            idx = Math.min(palabras.length, idx + paso);
                            pasoNum += 1;
                            bodySpan.textContent = palabras.slice(0, idx).join(' ');
                            if (pasoNum % 2 === 0 || idx >= palabras.length) {
                                desplazarChatSuave();
                            }
                            if (idx >= palabras.length) {
                                clearInterval(timerStream);
                                msg.classList.remove('ia-streaming');
                                msg.classList.add('ia-msg-complete');
                            }
                        }, 28);
                    }
                } else {
                    if (imagenAdjunta && String(imagenAdjunta).startsWith('data:image/')) {
                        const imgEl = document.createElement('img');
                        imgEl.src = imagenAdjunta;
                        imgEl.alt = 'Imagen enviada a la IA';
                        imgEl.className = 'ia-msg-user-img';
                        msg.appendChild(imgEl);
                    }
                    if (texto) {
                        const txtSpan = document.createElement('span');
                        txtSpan.className = 'ia-msg-user-text';
                        txtSpan.textContent = texto;
                        msg.appendChild(txtSpan);
                    }
                    aiMessages.appendChild(msg);
                    desplazarChatSuave();
                }

                let sesionActual = null;
                if (guardarEnHistorial && texto) {
                    sesionActual = registrarMensajeEnSesionLocal(tipo, texto);
                }

                if (guardarEnHistorial && typeof window.registrarMensajeIAEnFirebase === 'function') {
                    window.registrarMensajeIAEnFirebase({
                        role: tipo,
                        text: texto,
                        sessionId: sesionActual?.id || sesionActivaId || '',
                        sessionTitle: sesionActual?.title || ''
                    }).catch(() => {});
                }
                document.dispatchEvent(new CustomEvent('osito:ia-message', { detail: { role: tipo, text: texto } }));
                if (tipo === 'bot') {
                    hablarIA(texto);
                }
            }

            function mostrarLimiteInvitadoConBoton(texto) {
                if (!aiMessages) return;
                const msg = document.createElement('div');
                msg.className = 'msg bot';

                const parrafo = document.createElement('p');
                parrafo.style.margin = '0 0 10px 0';
                parrafo.textContent = texto;
                msg.appendChild(parrafo);

                const btnRegistro = document.createElement('button');
                btnRegistro.type = 'button';
                btnRegistro.className = 'btn-action ai-limite-registro-btn';
                btnRegistro.textContent = '📝 Registrarse';
                btnRegistro.onclick = function () {
                    if (typeof window.irARegistroDesdeIA === 'function') {
                        window.irARegistroDesdeIA();
                    }
                };
                msg.appendChild(btnRegistro);

                aiMessages.appendChild(msg);
                aiMessages.scrollTop = aiMessages.scrollHeight;
                hablarIA(texto);

                if (aiInput) {
                    aiInput.disabled = true;
                    aiInput.placeholder = 'Límite de invitado alcanzado. Regístrate para continuar.';
                }
                const btnEnviar = document.querySelector('.btn-send');
                if (btnEnviar) btnEnviar.disabled = true;
            }

            function apodoIA() {
                return aiGenero === 'female' ? 'osita' : 'osito';
            }

            function prefijoIA() {
                return aiNombre || (aiGenero ? apodoIA() : 'crack');
            }

            function setGeneroIA(genero) {
                const ultimoCambioVoz = parseInt(localStorage.getItem('osito_voice_gender_last_change') || '0', 10);
                const ahora = Date.now();
                if (ahora - ultimoCambioVoz < 3600000) {
                    const minutosRestantes = Math.ceil((3600000 - (ahora - ultimoCambioVoz)) / 60000);
                    if (typeof showToast === 'function') showToast(`Puedes cambiar la voz de la IA una vez cada hora. Espera ${minutosRestantes} min ⏳`);
                    return;
                }
                localStorage.setItem('osito_voice_gender_last_change', String(ahora));
                aiGenero = genero;
                localStorage.setItem('osito_ai_genero', genero);
                aiGenderBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.gender === genero));
                actualizarBloqueoIA();
                const apodo = apodoIA();
                agregarMensajeIA(`¡Qué onda, ${apodo}! Todo bien. Ahora sí, ¿con qué te ayudo hoy?`, 'bot');
                if (typeof showToast === 'function') showToast(`¡Voz cambiada a ${genero === 'female' ? 'Femenina (Osita)' : 'Masculina (Osito)'}! 🔊✨`);
            }

            function msParaProximoCambioNombre() {
                const ts = parseInt(localStorage.getItem('osito_ai_nombre_ts') || '0', 10);
                if (!ts) return 0;
                const restante = ts + 24 * 60 * 60 * 1000 - Date.now();
                return restante > 0 ? restante : 0;
            }

            function actualizarEstadoNombreIA() {
                if (!aiNameInput || !aiNameSave) return;
                const restante = aiNombre ? msParaProximoCambioNombre() : 0;
                aiNameInput.value = aiNombre;
                if (restante > 0) {
                    const horas = Math.ceil(restante / (60 * 60 * 1000));
                    aiNameInput.disabled = true;
                    aiNameSave.disabled = true;
                    aiNameSave.innerHTML = `<span aria-hidden="true">⏳</span> Podrás cambiarlo en ${horas}h`;
                } else {
                    aiNameInput.disabled = false;
                    aiNameSave.disabled = false;
                    aiNameSave.innerHTML = aiNombre
                        ? '<span aria-hidden="true">✏️</span> Cambiar nombre'
                        : '<span aria-hidden="true">✓</span> Guardar mi nombre';
                }
            }

            function guardarNombreIA() {
                if (aiNombre && msParaProximoCambioNombre() > 0) return;
                const nombre = (aiNameInput?.value || '').trim().replace(/[^\p{L}\p{N} _-]/gu, '').slice(0, 24);
                if (!nombre) return;
                const esCambio = Boolean(aiNombre) && aiNombre !== nombre;
                aiNombre = nombre;
                window.aiNombreActual = aiNombre;
                localStorage.setItem('osito_ai_nombre', aiNombre);
                localStorage.setItem('osito_ai_nombre_ts', Date.now().toString());
                actualizarEstadoNombreIA();
                agregarMensajeIA(
                    esCambio
                        ? `Listo, ahora te llamaré ${aiNombre}. Podrás volver a cambiarlo en 24 horas.`
                        : `Perfecto, desde ahora te llamare ${aiNombre}.`,
                    'bot'
                );
            }

            function hablarIA(texto) {
                const permitirPorLlamada = Boolean(window.ositoEnLlamadaIA);
                if ((!vozActiva && !permitirPorLlamada) || !('speechSynthesis' in window)) return;
                // Si estamos en llamada o el micrófono estaba encendido, apagamos el micrófono mientras habla la IA
                if (window.voiceAssistant && typeof window.voiceAssistant.stopListening === 'function') {
                    window.voiceAssistant.stopListening();
                }
                const velConfig = typeof obtenerVelocidadVozIA === 'function' ? obtenerVelocidadVozIA() : 1.0;
                if (window.OsitoVozHumana && typeof window.OsitoVozHumana.hablar === 'function') {
                    window.OsitoVozHumana.hablar(texto, { rate: velConfig });
                    return;
                }
                window.speechSynthesis.cancel();
                const limpio = String(texto || '').replace(/[^\p{L}\p{N}\s.,;:!?¡¿"'-]/gu, ' ').replace(/\s+/g, ' ').trim();
                if (!limpio) return;
                const utterance = new SpeechSynthesisUtterance(limpio);
                utterance.lang = 'es-MX';
                utterance.rate = velConfig || (esEquipoGamaBajaIA() ? 1.03 : 1.02);
                utterance.pitch = 1.05;
                window.speechSynthesis.speak(utterance);
            }

            function actualizarBotonVoz() {
                if (!aiVoiceToggle) return;
                aiVoiceToggle.classList.toggle('active', vozActiva);
                aiVoiceToggle.innerHTML = vozActiva ? '<span class="btn-icon">🔊</span> Voz On' : '<span class="btn-icon">🔇</span> Voz Off';
            }

            function actualizarBloqueoIA() {
                const bloqueado = !aiGenero;
                const esInvitadoAhora = typeof window.osEsInvitado === 'function' ? window.osEsInvitado() : true;
                // Los botones Osito/Osita solo se deshabilitan para cuentas
                // registradas (su género real ya viene fijo desde el perfil).
                // En modo invitado siempre quedan disponibles por si quieren
                // cambiar de opción.
                aiGenderBtns.forEach(btn => {
                    const bloquearBoton = Boolean(aiGenero) && !esInvitadoAhora;
                    btn.disabled = bloquearBoton;
                    btn.setAttribute('aria-disabled', bloquearBoton ? 'true' : 'false');
                });
                if (aiInput) {
                    aiInput.disabled = bloqueado;
                    aiInput.placeholder = bloqueado ? 'Primero elige Osito u Osita...' : 'Escribe cualquier pregunta...';
                    aiInput.setAttribute('aria-disabled', bloqueado ? 'true' : 'false');
                }
                aiSuggestions.forEach(btn => {
                    btn.disabled = bloqueado;
                    btn.setAttribute('aria-disabled', bloqueado ? 'true' : 'false');
                });
                if (aiForm) aiForm.classList.toggle('ai-locked', bloqueado);
            }

            function actualizarMensajeInicialIA() {
                if (!aiMessages) return;
                // Solo se toca el mensaje mientras siga siendo el único mensaje
                // (el de bienvenida por defecto); si ya hay conversación, no se altera.
                if (aiMessages.children.length !== 1) return;
                const primerMensaje = aiMessages.querySelector('.msg.bot');
                if (!primerMensaje) return;
                const esInvitado = typeof window.osEsInvitado === 'function' ? window.osEsInvitado() : true;
                if (esInvitado && !aiGenero) {
                    primerMensaje.textContent = '🤖 Identidad requerida: ¿Eres Osito o Osita?';
                } else {
                    primerMensaje.textContent = `🤖 ¡Qué onda, ${prefijoIA()}! Pregúntame lo que quieras.`;
                }
            }

            function sincronizarGeneroDeCuenta() {
                const generoGuardado = localStorage.getItem('osito_ai_genero') || '';
                if (generoGuardado && generoGuardado !== aiGenero) {
                    aiGenero = generoGuardado;
                    aiGenderBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.gender === aiGenero));
                }
                const nombreGuardado = localStorage.getItem('osito_ai_nombre') || '';
                if (nombreGuardado && nombreGuardado !== aiNombre) {
                    aiNombre = nombreGuardado;
                }
                actualizarBloqueoIA();
                actualizarMensajeInicialIA();
            }
            window.addEventListener('osito:firebase-auth-ready', sincronizarGeneroDeCuenta);

            function reproducirBienvenidaSitio() {
                if (bienvenidaReproducida) return;
                bienvenidaReproducida = true;
                const nombreUsuario = window.aiNombreActual || localStorage.getItem('osito_ai_nombre') || aiNombre || '';
                let bienvenida = (window.OsitoConocimiento && typeof window.OsitoConocimiento.generarMensajeBienvenidaLocal === 'function')
                    ? window.OsitoConocimiento.generarMensajeBienvenidaLocal(nombreUsuario)
                    : 'Bienvenido a El Sótano de Osito.';

                const tienePerfil = localStorage.getItem('osito_user_profile');
                const authUser = window.firebaseAuth?.currentUser || window.currentUser;
                const esInvitadoActual = Boolean(window.ositoGuestMode) || (!tienePerfil && !authUser);
                if (esInvitadoActual) {
                    bienvenida += ' Estás en modo invitado: por ahora solo puedes ver la pestaña de Videos y tienes 5 preguntas para la inteligencia artificial. Si inicias sesión o te registras, desbloqueas Directos, Canciones, Videos populares, Animaciones, Series, guardar tus Favoritos, personalizar los colores y temas del sitio, y preguntas ilimitadas a la inteligencia artificial.';
                }

                hablarIA(bienvenida);
            }

            window.reproducirBienvenidaSitio = reproducirBienvenidaSitio;

            function edadEnFecha(nacimiento, fecha = new Date()) {
                let edad = fecha.getFullYear() - nacimiento.anio;
                const yaCumplio = fecha.getMonth() > nacimiento.mes || (fecha.getMonth() === nacimiento.mes && fecha.getDate() >= nacimiento.dia);
                if (!yaCumplio) edad -= 1;
                return edad;
            }

            function anosCanal(fecha = new Date()) {
                let anos = fecha.getFullYear() - infoCanal.cumpleCanal.anioInicio;
                const yaCumplio = fecha.getMonth() > infoCanal.cumpleCanal.mes || (fecha.getMonth() === infoCanal.cumpleCanal.mes && fecha.getDate() >= infoCanal.cumpleCanal.dia);
                if (!yaCumplio) anos -= 1;
                return anos;
            }

            function obtenerTiempoFaltaCanal(targetYears = 5) {
                const ahora = new Date();
                const fechaObjetivo = new Date(infoCanal.cumpleCanal.anioInicio + targetYears, infoCanal.cumpleCanal.mes, infoCanal.cumpleCanal.dia);
                if (ahora >= fechaObjetivo) {
                    return `¡El canal ya cumplió los ${targetYears} años en YouTube! 🎉`;
                }
                const diffMs = fechaObjetivo - ahora;
                const diffDiasTotal = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
                const meses = Math.floor(diffDiasTotal / 30.4375);
                const diasRestantes = Math.floor(diffDiasTotal % 30.4375);
                return `El aniversario del canal es el 2 de junio. Para cumplir ${targetYears} años en YouTube (el 2 de junio de 2027) faltan aproximadamente ${meses} meses y ${diasRestantes} días. 🎂`;
            }

            function horaElSalvador() {
                return new Intl.DateTimeFormat('es-SV', {
                    timeZone: 'America/El_Salvador',
                    hour: 'numeric',
                    minute: '2-digit',
                    hour12: true
                }).format(new Date());
            }

            function elegirRespuesta(opciones) {
                if (!opciones.length) return `Mmm, ${prefijoIA()}, de eso no tengo base todavía. Dame más contexto y te ayudo mejor.`;
                let respuesta = opciones[turnoIA % opciones.length];
                if (respuesta === ultimaRespuestaIA && opciones.length > 1) {
                    respuesta = opciones[(turnoIA + 1) % opciones.length];
                }
                turnoIA += 1;
                ultimaRespuestaIA = respuesta;
                return respuesta;
            }

            function responderIA(pregunta) {
                const texto = normalizarPreguntaIA(pregunta).replace(/\s+/g, ' ').trim();
                const nombre = prefijoIA();

                // 1. Configuración de género si aún no está elegido
                if (!aiGenero && /\b(hombre|masculino|varon|chico|soy hombre|osito)\b/.test(texto) && !/\b(anos|edad|quien|cuando|como|cual|por que|porque)\b/.test(texto)) {
                    aiGenero = 'male'; 
                    localStorage.setItem('osito_ai_genero', aiGenero);
                    aiGenderBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.gender === aiGenero));
                    actualizarBloqueoIA();
                    return '¡Qué onda, osito! Todo bien. Ya te llamaré osito desde ahora. ¿Con qué te ayudo?';
                }

                if (!aiGenero && /\b(mujer|femenino|chica|soy mujer|osita)\b/.test(texto) && !/\b(anos|edad|quien|cuando|como|cual|por que|porque)\b/.test(texto)) {
                    aiGenero = 'female'; 
                    localStorage.setItem('osito_ai_genero', aiGenero);
                    aiGenderBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.gender === aiGenero));
                    actualizarBloqueoIA();
                    return '¡Qué onda, osita! Todo bien. Ya te llamaré osita desde ahora. ¿Con qué te ayudo?';
                }

                // 1.1 Saludos naturales y amigables
                if (/^(hola|buenas|que onda|qué onda|que tal|qué tal|buenos dias|buenas tardes|buenas noches|hey|holis|saludos)(\s+(osito|osita|mascota|mascotita|amigo|amiga|crack|bot|ia|a todos))?[!.]*$/.test(texto)) {
                    const saludos = [
                        `¡Qué onda, ${nombre}! ¿Cómo estás? Me alegra mucho verte por El Sótano de Osito. ¿Qué cuentas o de qué tienes ganas de platicar hoy? 😊`,
                        `¡Hola, ${nombre}! Todo bien por acá. Dime qué necesitas o qué duda tienes y con gusto lo revisamos. 🐻✨`,
                        `¡Buenas, ${nombre}! Aquí ando al cien. ¿Quieres saber novedades de OsitoYT360, hablar de videojuegos o alguna otra cosa? 🎮`,
                        `¡Hola, ${nombre}! Un gustazo saludarte. ¿Cómo va tu día? Cuéntame y charlamos un rato. 😄`
                    ];
                    return elegirRespuesta(saludos);
                }

                // 1.2 Cómo estás / Qué tal
                if (/^(como estas|cómo estás|como te va|cómo te va|como andas|cómo andas|que tal todo|qué tal todo|todo bien)[?.!]*$/.test(texto)) {
                    const comoEstas = [
                        `¡Todo súper bien, ${nombre}! Feliz de estar aquí en El Sótano de Osito platicando contigo. ¿Y tú cómo te encuentras hoy? 😊`,
                        `¡Al cien y con toda la energía, ${nombre}! Listo para ayudarte con lo que quieras o charlar de lo que te guste. ¿Cómo te ha ido? 🐻✨`,
                        `¡Muy contento de conversar contigo, ${nombre}! ¿Qué novedades tienes hoy? 😄`
                    ];
                    return elegirRespuesta(comoEstas);
                }

                // 1.3 Qué haces
                if (/^(que haces|qué haces|que estas haciendo|qué estás haciendo)[?.!]*$/.test(texto)) {
                    return `¡Aquí cuidando El Sótano de Osito, saludando a la comunidad y acompañándote! ¿Y tú qué andas haciendo de bueno por ahí, ${nombre}? 🎮`;
                }

                // 1.4 Agradecimientos
                if (/^(gracias|muchas gracias|mil gracias|te lo agradezco|se agradece)[!. ]*$/.test(texto)) {
                    return `¡De nada, ${nombre}! Para eso estoy aquí en El Sótano de Osito. Cualquier otra duda o pregunta que tengas, dime con confianza. ✨`;
                }

                // 1.5 Despedidas
                if (/^(adios|adiós|chao|chau|hasta luego|nos vemos|bye|bye bye)[!. ]*$/.test(texto)) {
                    return `¡Hasta luego, ${nombre}! Cuídate mucho y regresa pronto a visitar El Sótano de Osito. ¡Aquí te espero! 👋`;
                }

                // 2. Navegación al Chat en Vivo
                if (/^(llevame a chat|llevame al chat|llevarme al chat|ir al chat|abrir chat|abrir el chat|abre el chat|ver el chat|abrir chat en vivo|ir al chat en vivo)$/.test(texto)) {
                    if (typeof window.toggleLiveChatPanel === 'function') {
                        window.toggleLiveChatPanel();
                    }
                    return `¡Con gusto, ${nombre}! Te he abierto la ventana del chat en vivo para que converses en tiempo real. 💬`;
                }

                // 3. Navegación al canal de YouTube (solo órdenes directas de abrir el canal, sin interceptar preguntas como "¿cuál fue tu primer canal de YouTube?")
                if (/^(llevame al canal|llevarme al canal|ir al canal|abrir canal|abrir el canal|abre el canal|ver canal|mostrar canal|muestrame el canal|abre youtube|ir a youtube)$/.test(texto)) {
                    window.open('https://www.youtube.com/@OsitoYT360', '_blank', 'noopener');
                    return `¡Listo, ${nombre}! Te abrí el canal de YouTube.`;
                }

                // 4. Funciones de la página
                if (/^(que puedo hacer (aqui|en la pagina|en el sitio|en el sotano)|para que sirve (la pagina|el sitio)|funciones de(l sitio| la pagina)|de que trata (el sitio|la pagina))[?.!]*$/.test(texto)) {
                    return `Aquí en El Sótano de Osito puedes ver videos recientes, directos, canciones, guardar tus favoritos con la estrella, ajustar temas de color y conversar conmigo de cualquier tema que quieras.`;
                }

                // 5. Protección de datos personales y privados (SOLO cuando preguntan datos privados de Osito, jamás en preguntas normales)
                if (/ubicacion exacta de osito|direccion exacta de osito|donde vive osito|donde vives exactamente|en que (ciudad|municipio|departamento|colonia|calle|casa|barrio) (vive osito|vives)|cual es (tu|su) (direccion|numero de telefono|telefono personal|celular personal|whatsapp|apellido real|nombre real)|dame (tu|su) (numero|telefono|whatsapp|celular|direccion)|apellido (completo|de osito|real)|como se llama osito en la vida real|nombre real de osito|en que (colegio|instituto|escuela|universidad) (estudia|estudias) osito|donde (estudia|estudias) osito|como se llaman (tus|sus) (padres|papas|hermanos) de osito|osito tiene (novia|novio|pareja)|quien es (la novia|el novio|la pareja) de osito/.test(texto)) {
                    return `Por privacidad no comparto datos personales privados de Osito (como dirección exacta, teléfono, nombre real, familia o lugar de estudio), ¡pero pregúntame lo que quieras de cualquier otro tema, videojuegos o del canal y platicamos! 🛡️`;
                }

                // 5.1 Aviso si piden crear o generar imágenes
                if (/\b(crea|crear|genera|generar|haz|hacer|dibuja|dibujar)\s+(una\s+|la\s+|algunas\s+)?(imagen|imagenes|foto|fotos|dibujo|ilustracion)\b/.test(texto)) {
                    return `No genero imágenes, pero puedo responderte cualquier pregunta, ayudarte con tus tareas, explicarte cosas de videojuegos o platicar contigo de lo que quieras. 😊`;
                }

                // 6. Consultas de Hora
                if (/\bhora en el salvador\b/.test(texto) || (/\bque hora\b/.test(texto) && /salvador/.test(texto))) {
                    return `En El Salvador son las ${horaElSalvador()}.`;
                }
                if (/^(que hora es|cual es la hora|hora actual|que hora tienes|dime la hora)(\s+ahora|\s+hoy)?[?.!]*$/.test(texto)) {
                    const infoLocal = (window.OsitoConocimiento && window.OsitoConocimiento.obtenerInfoUbicacionUsuario) ?
                        window.OsitoConocimiento.obtenerInfoUbicacionUsuario() : null;
                    const horaLocalStr = new Date().toLocaleTimeString('es-SV', { hour: 'numeric', minute: '2-digit' });
                    return `En tu ubicación son las ${horaLocalStr}${infoLocal?.pais ? ` (${infoLocal.pais})` : ''}. En El Salvador son las ${horaElSalvador()}.`;
                }

                // 7. Búsqueda exacta en la Base de Conocimiento oficial del canal (solo datos exactos de OsitoGamer360YT)
                if (window.OsitoConocimiento && typeof window.OsitoConocimiento.buscarEnBaseConocimiento === 'function') {
                    const respuestaConocimiento = window.OsitoConocimiento.buscarEnBaseConocimiento(pregunta, { modoOffline: false });
                    if (respuestaConocimiento) {
                        return respuestaConocimiento;
                    }
                }

                // 8. Respaldo directo con infoCanal en index.html por si preguntan nombre del creador, nombre del canal, edad de Osito o años del canal
                if (/^(como se llama (tu|el) creador|quien (es (tu|el) creador|te creo|te hizo|te programo|creo (esta ia|el sitio|la pagina|el sotano))|cual es el nombre de (tu|el) creador|nombre de (tu|el) creador)[?.!]*$/.test(texto)) {
                    return 'Mi creador se llama Osito.';
                }
                if (/^(como se llama (el|tu|su) canal|cual es (el nombre de(l| tu| su) canal|(tu|su|el) canal)|nombre de(l| tu| su) canal)[?.!]*$/.test(texto) && !/(primer|anterior|original|antes|video)/.test(texto)) {
                    return 'El canal se llama OsitoGamer360YT (Osito Gamer 360 YouTube).';
                }
                if (/^(cuantos anos tiene osito|cuantos anos tienes|que edad tiene osito|que edad tienes|edad de osito)[?.!]*$/.test(texto) && !/canal/.test(texto)) {
                    const edad = edadEnFecha(infoCanal.cumpleCreador);
                    return `Osito tiene ${edad} años (nació el 28 de septiembre de 2008).`;
                }
                if (/^(cuantos anos tiene el canal|cuantos anos lleva el canal)[?.!]*$/.test(texto)) {
                    const anos = anosCanal();
                    return `El canal ${infoCanal.canal} tiene ${anos} años en YouTube. Su aniversario es el 2 de junio (empezó el 2 de junio de 2022). 🎉`;
                }

                // 9. Para todo lo demás (conversación, saludos, preguntas abiertas, "vale", "cómo", cultura general, juegos, etc.) responde Gemini API con memoria completa
                return null;
            }

            function mensajeNoDisponibleLocal() {
                return 'No pude conectar con la IA en este momento. Revisa la conexión del servidor y la configuración de Gemini.';
            }

            let imagenPendienteIA = '';
            const aiImageBtn = document.getElementById('ai-image-btn');
            const aiImageInput = document.getElementById('ai-image-input');
            const aiImagePreviewBar = document.getElementById('ai-image-preview-bar');
            const aiImagePreviewThumb = document.getElementById('ai-image-preview-thumb');
            const aiImagePreviewRemove = document.getElementById('ai-image-preview-remove');

            function limpiarImagenPendienteIA() {
                imagenPendienteIA = '';
                if (aiImageInput) aiImageInput.value = '';
                if (aiImagePreviewThumb) aiImagePreviewThumb.src = '';
                if (aiImagePreviewBar) aiImagePreviewBar.hidden = true;
                if (aiImageBtn) aiImageBtn.classList.remove('has-image');
            }

            function comprimirImagenParaIA(file) {
                return new Promise((resolve) => {
                    if (!file || !file.type || !file.type.startsWith('image/')) {
                        resolve('');
                        return;
                    }
                    const reader = new FileReader();
                    reader.onload = () => {
                        const img = new Image();
                        img.onload = () => {
                            const maxDim = 960;
                            const scale = Math.min(1, maxDim / img.width, maxDim / img.height);
                            const canvas = document.createElement('canvas');
                            canvas.width = Math.max(1, Math.round(img.width * scale));
                            canvas.height = Math.max(1, Math.round(img.height * scale));
                            const ctx = canvas.getContext('2d');
                            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                            resolve(canvas.toDataURL('image/jpeg', 0.82));
                        };
                        img.onerror = () => resolve('');
                        img.src = reader.result;
                    };
                    reader.onerror = () => resolve('');
                    reader.readAsDataURL(file);
                });
            }

            async function seleccionarArchivoImagenIA(file) {
                if (!file) return;
                const imgsLeidas = parseInt(localStorage.getItem('osito_images_read_count') || '0', 10);
                if (imgsLeidas >= 15) {
                    if (typeof showToast === 'function') showToast('Has alcanzado el límite máximo de 15 imágenes leídas permitidas 📷✨');
                    agregarMensajeIA('Has alcanzado el límite máximo de 15 imágenes leídas en esta sesión. Puedes seguir charlando mediante texto o voz. 😊', 'bot');
                    return;
                }
                if (!file.type || !file.type.startsWith('image/')) {
                    agregarMensajeIA('Por favor selecciona un archivo de imagen válido (JPG, PNG o WebP).', 'bot');
                    return;
                }
                const dataUrl = await comprimirImagenParaIA(file);
                if (!dataUrl) {
                    agregarMensajeIA('No pude leer esa imagen. Intenta con otra foto.', 'bot');
                    return;
                }
                const countActual = imgsLeidas + 1;
                localStorage.setItem('osito_images_read_count', String(countActual));
                imagenPendienteIA = dataUrl;
                if (aiImagePreviewThumb) aiImagePreviewThumb.src = dataUrl;
                if (aiImagePreviewBar) aiImagePreviewBar.hidden = false;
                if (aiImageBtn) aiImageBtn.classList.add('has-image');
                if (aiInput) aiInput.focus();
            }

            if (aiImageBtn && aiImageInput) {
                aiImageBtn.addEventListener('click', () => aiImageInput.click());
                aiImageInput.addEventListener('change', (e) => {
                    const f = e.target.files && e.target.files[0];
                    if (f) seleccionarArchivoImagenIA(f);
                });
            }
            if (aiImagePreviewRemove) {
                aiImagePreviewRemove.addEventListener('click', limpiarImagenPendienteIA);
            }
            if (aiInput) {
                aiInput.addEventListener('paste', (e) => {
                    const items = e.clipboardData && e.clipboardData.items;
                    if (!items) return;
                    for (let i = 0; i < items.length; i++) {
                        if (items[i].type && items[i].type.startsWith('image/')) {
                            const f = items[i].getAsFile();
                            if (f) {
                                e.preventDefault();
                                seleccionarArchivoImagenIA(f);
                                break;
                            }
                        }
                    }
                });
            }

            async function enviarPreguntaIA(pregunta) {
                const preguntaBase = (pregunta || '').trim();
                const limpia = typeof window.limpiarRepeticionesVozOsito === 'function'
                    ? window.limpiarRepeticionesVozOsito(preguntaBase)
                    : preguntaBase;
                const imagenEnviada = imagenPendienteIA;
                if (!limpia && !imagenEnviada) return;
                limpiarImagenPendienteIA();

                function esInvitado() {
                    if (window.ositoGuestMode) return true;
                    const tienePerfil = localStorage.getItem('osito_user_profile');
                    const authUser = window.firebaseAuth?.currentUser || window.currentUser;
                    if (!tienePerfil && !authUser) return true;
                    return false;
                }

                // LÍMITE DE 5 PREGUNTAS EN MODO INVITADO (se reinicia cada 5 horas)
                const CINCO_HORAS_MS = 5 * 60 * 60 * 1000;
                function obtenerConteoInvitadoIA() {
                    const ahora = Date.now();
                    const reiniciaEn = parseInt(localStorage.getItem('osito_guest_ia_reset_at') || '0', 10);
                    if (!reiniciaEn || ahora >= reiniciaEn) {
                        localStorage.setItem('osito_guest_ia_count', '0');
                        localStorage.setItem('osito_guest_ia_reset_at', String(ahora + CINCO_HORAS_MS));
                    }
                    return parseInt(localStorage.getItem('osito_guest_ia_count') || '0', 10);
                }

                if (esInvitado()) {
                    let conteo = obtenerConteoInvitadoIA();
                    conteo += 1;
                    localStorage.setItem('osito_guest_ia_count', conteo.toString());

                    if (conteo > 5) {
                        const mensajesInvitacion = (window.OsitoConocimiento && window.OsitoConocimiento.MENSAJES_LIMITE_INVITADO) || [
                            'Has alcanzado el límite de 5 preguntas en modo invitado. Vuelve a intentarlo en 5 horas, o regístrate/inicia sesión para conversar con la IA sin límites.',
                            'Llegaste al límite de 5 preguntas permitidas para invitados. El límite se reinicia cada 5 horas; también puedes iniciar sesión o crear tu cuenta para continuar ahora mismo.',
                            'Has completado tus 5 preguntas de prueba como invitado. Podrás volver a preguntar en 5 horas, o inicia sesión/regístrate en El Sótano de Osito para seguir sin esperar.',
                            'Se agotó el límite de 5 preguntas del modo invitado. Se reinicia automáticamente en 5 horas. ¡O únete a la comunidad iniciando sesión o registrándote para desbloquear acceso ilimitado!'
                        ];
                        const indice = (conteo - 6) % mensajesInvitacion.length;
                        const msgLimite = mensajesInvitacion[indice];
                        agregarMensajeIA(limpia || '📷 Imagen enviada', 'user', imagenEnviada);
                        if (aiInput) aiInput.value = '';
                        setTimeout(() => mostrarLimiteInvitadoConBoton(msgLimite), 180);
                        return;
                    }
                }

                agregarMensajeIA(limpia, 'user', imagenEnviada); 
                if (aiInput) aiInput.value = '';

                // Si no hay imagen adjunta, revisamos respuestas instantáneas locales y cálculos
                if (!imagenEnviada) {
                    const respuestaLocal = responderIA(limpia);
                    if (respuestaLocal !== null) {
                        setTimeout(() => agregarMensajeIA(respuestaLocal, 'bot'), 40);
                        return;
                    }

                    const cuentaRapida = window.OsitoIA && window.OsitoIA.calcular ? window.OsitoIA.calcular(limpia) : null;
                    if (cuentaRapida) {
                        setTimeout(() => agregarMensajeIA(cuentaRapida, 'bot'), 40);
                        return;
                    }
                }

                // 3) Conversación inteligente y análisis de imágenes con la API de Gemini (/api/ia) + Memoria de chats estilo ChatGPT
                if (window.OsitoIA && typeof window.OsitoIA.preguntar === 'function') {
                    const sesionActual = typeof obtenerSesionActiva === 'function' ? obtenerSesionActiva() : null;
                    const memoriaChats = typeof construirMemoriaGlobalChats === 'function' ? construirMemoriaGlobalChats() : '';
                    const resultadoGemini = await window.OsitoIA.preguntar(limpia || 'Describe qué ves en esta imagen y comenta al respecto.', {
                        nombre: aiNombre,
                        genero: aiGenero,
                        imagen: imagenEnviada,
                        memoriaGlobal: memoriaChats,
                        tituloChat: sesionActual ? sesionActual.title : ''
                    });
                    if (resultadoGemini && resultadoGemini.texto) {
                        agregarMensajeIA(resultadoGemini.texto, 'bot');
                        return;
                    }
                }

                // 4) Respaldo conversacional offline si el dispositivo está sin internet
                const libre = window.OsitoIA && window.OsitoIA.respuestaLibre ? window.OsitoIA.respuestaLibre(limpia) : null;
                const respaldoOffline = (window.OsitoConocimiento && typeof window.OsitoConocimiento.buscarEnBaseConocimiento === 'function')
                    ? window.OsitoConocimiento.buscarEnBaseConocimiento(limpia, { modoOffline: true })
                    : null;
                setTimeout(() => agregarMensajeIA(libre || respaldoOffline || mensajeNoDisponibleLocal(), 'bot'), 40);
            }

            aiGenderBtns.forEach(btn => {
                btn.classList.toggle('active', btn.dataset.gender === aiGenero); 
                btn.addEventListener('click', () => setGeneroIA(btn.dataset.gender));
            });

            if (aiNombre && aiNameInput && aiNameSave) {
                actualizarEstadoNombreIA();
            }
            window.aiNombreActual = aiNombre;
            if (aiNameSave) aiNameSave.addEventListener('click', guardarNombreIA);

            actualizarBotonVoz();
            actualizarBloqueoIA();
            actualizarMensajeInicialIA();
            if (aiVoiceToggle) {
                aiVoiceToggle.addEventListener('click', () => {
                    vozActiva = !vozActiva;
                    localStorage.setItem('osito_ai_voz', vozActiva ? 'true' : 'false'); 
                    if (!vozActiva && 'speechSynthesis' in window) window.speechSynthesis.cancel();
                    actualizarBotonVoz();
                    if (vozActiva) hablarIA('Voz activada');
                });
            }

            if (aiForm && aiInput) {
                aiForm.addEventListener('submit', (event) => {
                    event.preventDefault();
                    enviarPreguntaIA(aiInput.value); 
                });
            }

            aiSuggestions.forEach(btn => {
                btn.addEventListener('click', () => enviarPreguntaIA(btn.dataset.question || btn.textContent));
            });

            // =========================================================================
            // MODO LLAMADA EN VIVO CON LA IA (Turnos automáticos IA <-> Micrófono + Orbe)
            // =========================================================================
            window.ositoEnLlamadaIA = false;
            let callTimerInterval = null;
            let callSeconds = 0;
            let callAutoMicTimeout = null;

            const callViewEl = document.getElementById('ia-call-view');
            const chatShellEl = document.getElementById('ai-chat-shell') || document.querySelector('.ai-chat-shell');
            const aiSectionEl = document.getElementById('ai-section');
            const callTimerEl = document.getElementById('ia-call-timer');
            const callBadgeEl = document.getElementById('ia-call-state-badge');
            const callOrbEl = document.getElementById('ia-call-orb');
            const callSubEl = document.getElementById('ia-call-subtitle');
            const callMicBtn = document.getElementById('ia-call-mic-btn');
            const callMicLabel = document.getElementById('ia-call-mic-label');
            const callHangupBtn = document.getElementById('ia-call-hangup-btn');
            const callHeaderBtn = document.getElementById('ia-call-header-btn');
            const callInlineBtn = document.getElementById('ai-call-btn');

            function formatearTiempoLlamada(seg) {
                const m = String(Math.floor(seg / 60)).padStart(2, '0');
                const s = String(seg % 60).padStart(2, '0');
                return `${m}:${s}`;
            }

            let callIdleExprTimer = null;
            function actualizarUIEstadoLlamada(estado) {
                if (!window.ositoEnLlamadaIA) return;
                if (window.CallModeEngine && typeof window.CallModeEngine.setCallAvatarState === 'function') {
                    if (estado === 'listening') window.CallModeEngine.setCallAvatarState('LISTENING');
                    else if (estado === 'speaking') window.CallModeEngine.setCallAvatarState('SPEAKING');
                    else if (estado === 'processing') window.CallModeEngine.setCallAvatarState('THINKING');
                    else window.CallModeEngine.setCallAvatarState('IDLE');
                }
                if (callMicBtn) {
                    callMicBtn.classList.toggle('active-mic', estado === 'listening');
                    callMicBtn.classList.toggle('speaking-lock', estado === 'speaking');
                }
                if (callMicLabel) {
                    if (estado === 'listening') {
                        callMicLabel.textContent = 'Escuchando...';
                    } else if (estado === 'speaking') {
                        callMicLabel.textContent = 'Hablando...';
                    } else if (estado === 'processing') {
                        callMicLabel.textContent = 'Pensando...';
                    } else {
                        callMicLabel.textContent = 'Micrófono';
                    }
                }
                if (callBadgeEl) {
                    if (estado === 'speaking') {
                        callBadgeEl.textContent = '🔊 Osito está hablando...';
                    } else if (estado === 'listening') {
                        callBadgeEl.textContent = '🎙️ Micrófono encendido · Te escucho...';
                    } else if (estado === 'processing') {
                        callBadgeEl.textContent = '⚡ Pensando respuesta...';
                    } else {
                        callBadgeEl.textContent = '🎙️ Modo llamada activo';
                    }
                }
            }

            function esModoInvitadoLocal() {
                return typeof window.osEsInvitado === 'function' ? window.osEsInvitado() : document.body.classList.contains('solo-invitado') || window.ositoGuestMode;
            }

            function iniciarLlamadaIA() {
                if (esModoInvitadoLocal()) {
                    if (typeof showToast === 'function') showToast('¡Inicia sesión o crea una cuenta para usar el modo llamada y el micrófono! 🎙️✨');
                    return;
                }
                const panel = document.getElementById('ai-section');
                if (panel && !panel.classList.contains('active')) {
                    toggleIAPanel();
                }
                if (!aiGenero) {
                    aiGenero = 'male';
                    localStorage.setItem('osito_ai_genero', 'male');
                    aiGenderBtns.forEach(btn => btn.classList.toggle('active', btn.dataset.gender === 'male'));
                    actualizarBloqueoIA();
                }
                vozActiva = true;
                localStorage.setItem('osito_ai_voz', 'true');
                actualizarBotonVoz();
                if (window.voiceAssistant) {
                    window.voiceAssistant.voiceOutputEnabled = true;
                }

                window.ositoEnLlamadaIA = true;
                document.body.classList.add('ia-call-mode-active');
                if (aiSectionEl) {
                    aiSectionEl.classList.add('ia-call-active', 'ia-call-entering');
                    setTimeout(() => aiSectionEl.classList.remove('ia-call-entering'), 520);
                }

                // Ocultar botón X de cerrar la IA mientras dure la llamada para que no se buguee
                const closeBtns = document.querySelectorAll('.ia-close-btn');
                closeBtns.forEach(b => b.style.setProperty('display', 'none', 'important'));

                // Ocultar por completo el chat de la IA
                if (chatShellEl) {
                    chatShellEl.hidden = true;
                    chatShellEl.classList.add('ia-call-hidden');
                    chatShellEl.style.setProperty('display', 'none', 'important');
                    chatShellEl.style.setProperty('visibility', 'hidden', 'important');
                    chatShellEl.style.setProperty('height', '0px', 'important');
                }
                if (callViewEl) {
                    callViewEl.hidden = false;
                    callViewEl.style.removeProperty('display');
                    callViewEl.classList.remove('ia-call-view-enter');
                    void callViewEl.offsetWidth;
                    callViewEl.classList.add('ia-call-view-enter');
                }
                if (callHeaderBtn) {
                    callHeaderBtn.classList.add('active');
                    callHeaderBtn.setAttribute('aria-pressed', 'true');
                }
                if (callInlineBtn) callInlineBtn.classList.add('active');

                if (window.OsitoFaceSound && window.OsitoFaceSound.reproducir) {
                    window.OsitoFaceSound.reproducir('call_start');
                }

                // Inicializar motor exclusivo de llamada con Avatar 2D Circular
                if (window.CallModeEngine && typeof window.CallModeEngine.iniciarLlamada === 'function') {
                    window.CallModeEngine.iniciarLlamada();
                }

                callSeconds = 0;
                if (callTimerEl) callTimerEl.textContent = '00:00';
                if (callTimerInterval) clearInterval(callTimerInterval);
                callTimerInterval = setInterval(() => {
                    callSeconds += 1;
                    if (callTimerEl) callTimerEl.textContent = formatearTiempoLlamada(callSeconds);
                }, 1000);

                const saludoLlamada = `¡Hola, ${prefijoIA()}! Ya estamos en modo llamada de voz en vivo. Puedes platicar conmigo o activar la cámara con el botón 📷. ¿De qué quieres platicar?`;
                if (callSubEl) callSubEl.textContent = saludoLlamada;
                if (window.CallModeEngine && typeof window.CallModeEngine.mostrarRespuestaTexto === 'function') {
                    window.CallModeEngine.mostrarRespuestaTexto(saludoLlamada);
                }
                actualizarUIEstadoLlamada('speaking');
                hablarIA(saludoLlamada);

                setTimeout(() => {
                    if (window.ositoEnLlamadaIA && (!('speechSynthesis' in window) || (!window.speechSynthesis.speaking && !window.speechSynthesis.pending))) {
                        encenderMicrofonoTurnoLlamada();
                    }
                }, 900);
            }

            function encenderMicrofonoTurnoLlamada() {
                if (!window.ositoEnLlamadaIA) return;
                if (callAutoMicTimeout) clearTimeout(callAutoMicTimeout);
                callAutoMicTimeout = setTimeout(() => {
                    if (!window.ositoEnLlamadaIA) return;
                    if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) return;
                    actualizarUIEstadoLlamada('listening');
                    if (callSubEl) {
                        callSubEl.textContent = '🎙️ Micrófono encendido · Te escucho, habla ahora...';
                    }
                    if (window.voiceAssistant && typeof window.voiceAssistant.startListening === 'function') {
                        window.voiceAssistant.startListening(true);
                    }
                }, 220);
            }

            function finalizarLlamadaIA() {
                window.ositoEnLlamadaIA = false;
                document.body.classList.remove('ia-call-mode-active');
                if (aiSectionEl) {
                    aiSectionEl.classList.remove('ia-call-active', 'ia-call-entering');
                }

                // Finalizar motor exclusivo de llamada
                if (window.CallModeEngine && typeof window.CallModeEngine.finalizarLlamada === 'function') {
                    window.CallModeEngine.finalizarLlamada();
                }

                // Restaurar botón X
                const closeBtns = document.querySelectorAll('.ia-close-btn');
                closeBtns.forEach(b => b.style.removeProperty('display'));

                if (callAutoMicTimeout) {
                    clearTimeout(callAutoMicTimeout);
                    callAutoMicTimeout = null;
                }
                if (callTimerInterval) {
                    clearInterval(callTimerInterval);
                    callTimerInterval = null;
                }
                if (window.voiceAssistant && typeof window.voiceAssistant.stopListening === 'function') {
                    window.voiceAssistant.stopListening();
                }
                if ('speechSynthesis' in window) {
                    window.speechSynthesis.cancel();
                }
                if (callIdleExprTimer) {
                    clearInterval(callIdleExprTimer);
                    callIdleExprTimer = null;
                }
                if (callOrbEl) {
                    callOrbEl.classList.remove('is-speaking', 'is-listening', 'is-thinking');
                    callOrbEl.removeAttribute('data-expr');
                    callOrbEl.setAttribute('data-estado', 'idle');
                }
                if (callViewEl) {
                    callViewEl.hidden = true;
                    callViewEl.classList.remove('ia-call-view-enter');
                }
                if (chatShellEl) {
                    chatShellEl.hidden = false;
                    chatShellEl.classList.remove('ia-call-hidden');
                    chatShellEl.style.removeProperty('display');
                    chatShellEl.style.removeProperty('visibility');
                    chatShellEl.style.removeProperty('height');
                }
                if (callHeaderBtn) {
                    callHeaderBtn.classList.remove('active');
                    callHeaderBtn.setAttribute('aria-pressed', 'false');
                }
                if (callInlineBtn) callInlineBtn.classList.remove('active');
                if (window.OsitoFaceSound && window.OsitoFaceSound.reproducir) {
                    window.OsitoFaceSound.reproducir('call_end');
                }
                desplazarChatSuave();
            }

            function toggleLlamadaIA() {
                if (window.ositoEnLlamadaIA) {
                    finalizarLlamadaIA();
                } else {
                    iniciarLlamadaIA();
                }
            }

            window.iniciarLlamadaIA = iniciarLlamadaIA;
            window.finalizarLlamadaIA = finalizarLlamadaIA;
            window.toggleLlamadaIA = toggleLlamadaIA;

            // Sincronización automática: cuando la IA empieza a hablar -> apagar mic y mover el orbe.
            // Cuando la IA deja de hablar -> encender el micrófono automáticamente.
            document.addEventListener('osito:tts-start', () => {
                if (!window.ositoEnLlamadaIA) return;
                if (callAutoMicTimeout) {
                    clearTimeout(callAutoMicTimeout);
                    callAutoMicTimeout = null;
                }
                if (window.voiceAssistant && typeof window.voiceAssistant.stopListening === 'function') {
                    window.voiceAssistant.stopListening();
                }
                actualizarUIEstadoLlamada('speaking');
            });

            document.addEventListener('osito:tts-end', () => {
                if (!window.ositoEnLlamadaIA) return;
                encenderMicrofonoTurnoLlamada();
            });

            document.addEventListener('voiceassistant:state', (e) => {
                if (!window.ositoEnLlamadaIA) return;
                const st = e?.detail?.state;
                if (st === 'listening') {
                    actualizarUIEstadoLlamada('listening');
                } else if (st === 'processing') {
                    actualizarUIEstadoLlamada('processing');
                } else if (st === 'speaking') {
                    actualizarUIEstadoLlamada('speaking');
                }
            });

            if (callHangupBtn) {
                callHangupBtn.addEventListener('click', () => finalizarLlamadaIA());
            }
            if (callMicBtn) {
                callMicBtn.addEventListener('click', () => {
                    if (window.voiceAssistant && typeof window.voiceAssistant.toggle === 'function') {
                        window.voiceAssistant.toggle();
                    }
                });
            }
            if (callOrbEl) {
                callOrbEl.addEventListener('click', () => {
                    if (window.voiceAssistant && typeof window.voiceAssistant.toggle === 'function') {
                        window.voiceAssistant.toggle();
                    }
                });
            }

            // Design presets and customization bindings
            const presetBtns = document.querySelectorAll('.design-preset');
            presetBtns.forEach(btn => {
                btn.addEventListener('click', () => {
                    const p1 = btn.dataset.p1;
                    const p2 = btn.dataset.p2;
                    cambiarFondo(p1, p2); 
                });
            });

            const fontRange = document.getElementById('font-size-range');
            if (fontRange) {
                fontRange.addEventListener('input', () => {
                    const num = parseInt(fontRange.value, 10) || 14;
                    const maxPermitido = window.innerWidth <= 640 ? 14.5 : (window.innerWidth <= 1180 ? 15.5 : 20);
                    const finalFont = Math.min(maxPermitido, Math.max(12, num));
                    document.documentElement.style.fontSize = finalFont + 'px';
                    localStorage.setItem('osito_font_size', String(finalFont)); 
                });
            }

            const layoutCheckbox = document.getElementById('layout-compact');
            if (layoutCheckbox) {
                layoutCheckbox.addEventListener('change', () => {
                    const isCompact = layoutCheckbox.checked;
                    document.body.classList.toggle('compact-layout', isCompact); 
                    localStorage.setItem('osito_layout_compact', isCompact ? 'true' : 'false');
                });
            }
        })();

        function toggleIAPanel() {
            const maintenance = document.getElementById('maintenance-overlay');
            if (maintenance && !maintenance.hidden) return;
            const esMovilTablet = window.matchMedia && window.matchMedia('(max-width: 1024px)').matches;
            if (esMovilTablet && !window.ositoEnIAPage) { window.location.href = 'ia.html'; return; }
            const panel = document.getElementById('ai-section'), bubble = document.getElementById('ia-bubble');
            if (!panel) return;
            if (window.ositoEnLlamadaIA && typeof window.finalizarLlamadaIA === 'function') window.finalizarLlamadaIA();
            const isNowActive = panel.classList.toggle('active');
            if (bubble) { bubble.classList.toggle('open', isNowActive); bubble.setAttribute('aria-expanded', isNowActive ? 'true' : 'false'); }
        }
        (function iniciarMantenimientoGlobal(){
            function controlarMusicaMantenimiento(activo){
                const maintenanceAudio=document.getElementById('maintenance-music');
                const mainAudio=document.getElementById('bg-music');
                if(!maintenanceAudio) return;
                maintenanceAudio.loop=true;
                maintenanceAudio.volume=0.16; /* suave, no fuerte */
                if(activo){
                    if(mainAudio){ window.__ositoMaintenanceMusicWasPlaying=!mainAudio.paused; mainAudio.pause(); }
                    try { const p=maintenanceAudio.play(); if(p&&p.catch)p.catch(()=>{}); } catch(_){}
                }else{
                    maintenanceAudio.pause();
                    try{ maintenanceAudio.currentTime=0; }catch(_){}
                    if(mainAudio && window.__ositoMaintenanceMusicWasPlaying){
                        try{ const p=mainAudio.play(); if(p&&p.catch)p.catch(()=>{}); }catch(_){}
                    }
                    window.__ositoMaintenanceMusicWasPlaying=false;
                }
            }
            function pintar(activo){ const o=document.getElementById('maintenance-overlay'); if(!o)return; o.hidden=!activo; document.body.classList.toggle('site-maintenance-active',!!activo); controlarMusicaMantenimiento(!!activo); }
            window.__ositoMaintenancePaint=pintar;
            document.addEventListener('DOMContentLoaded',function(){ try{
                if(window.dbFirebase && window.dbFirebase.doc) window.dbFirebase.doc('siteSettings/public').onSnapshot(function(s){ pintar(!!(s.exists && s.data() && s.data().maintenance)); },function(){});
            }catch(_){} });
        })();
