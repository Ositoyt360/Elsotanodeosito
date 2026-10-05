/**
 * ============================================================================
 * CALL MODE ENGINE (V64) — MODO LLAMADA AISLADO
 * ============================================================================
 * Este archivo pertenece EXCLUSIVAMENTE al modo llamada / voz en vivo.
 * El personaje 3D / cubo del modo normal y sus animaciones, expresiones,
 * sonidos y personalidades permanecen 100% intactos e independientes.
 * ============================================================================
 */
(function (global) {
    'use strict';

    // --- ESTADOS DEL AVATAR DE LLAMADA ---
    var CALL_STATES = [
        'IDLE', 'LISTENING', 'THINKING', 'SPEAKING',
        'HAPPY', 'SAD', 'SURPRISED', 'CONFUSED',
        'LAUGHING', 'EXCITED', 'TIRED', 'SLEEPING'
    ];

    var estadoActual = 'IDLE';
    var avatarEl = null;
    var mouthEl = null;
    var sparkEl = null;
    var transcriptUserEl = null;
    var transcriptUserBox = null;
    var responseTextEl = null;
    var responseBox = null;
    var micBtn = null;
    var micLabel = null;
    var camBtn = null;
    var camBox = null;
    var camVideo = null;

    // Estado del Micrófono y Mute
    var isMicMuted = false;
    var isListening = false;
    var hasUserSpoke = false;

    // Estado de la Cámara
    var cameraStream = null;
    var isCameraActive = false;
    var latestFrameBase64 = null;
    var frameCaptureTimer = null;

    // Web Audio API para Lip-Sync y Sonidos de Expresión
    var audioCtx = null;
    var analyser = null;
    var lipSyncAnimId = null;
    var isSpeakingAudio = false;

    // Timers de animación natural Idle y parpadeo
    var idleBlinkTimer = null;
    var idleGlanceTimer = null;
    var idleExpressionTimer = null;

    // Emojis de expresión para el spark flotante del CallAvatar
    var SPARKS = {
        THINKING: '💭',
        HAPPY: '✨',
        LAUGHING: '😂',
        SURPRISED: '❗',
        CONFUSED: '❓',
        SAD: '💧',
        EXCITED: '🎉',
        SLEEPING: '💤',
        TIRED: '🥱'
    };

    // ========================================================================
    // 1. INICIALIZACIÓN Y MONTAJE DEL CALL AVATAR 2D
    // ========================================================================
    function inicializarElementos() {
        avatarEl = document.getElementById('call-avatar');
        mouthEl = document.getElementById('call-avatar-mouth');
        sparkEl = document.getElementById('call-avatar-spark');
        transcriptUserEl = document.getElementById('call-user-transcript-text');
        transcriptUserBox = document.getElementById('call-user-transcript');
        responseTextEl = document.getElementById('call-response-text');
        responseBox = document.getElementById('call-response');
        micBtn = document.getElementById('ia-call-mic-btn');
        micLabel = document.getElementById('ia-call-mic-label');
        camBtn = document.getElementById('ia-call-cam-btn');
        camBox = document.getElementById('call-camera-preview-box');
        camVideo = document.getElementById('call-camera-video');

        var camCloseBtn = document.getElementById('call-camera-close-btn');
        if (camCloseBtn) {
            camCloseBtn.onclick = function (e) {
                e.stopPropagation();
                desactivarCamara();
            };
        }

        if (camBtn) {
            camBtn.onclick = toggleCamara;
        }

        if (micBtn) {
            micBtn.onclick = toggleMute;
        }

        var avatarClick = document.getElementById('call-avatar-stage');
        if (avatarClick) {
            avatarClick.onclick = function () {
                if (estadoActual === 'IDLE') {
                    setCallAvatarState('HAPPY');
                    playCallExpressionSound('laugh');
                    setTimeout(function () {
                        if (estadoActual === 'HAPPY') setCallAvatarState('IDLE');
                    }, 1400);
                }
            };
        }
    }

    // ========================================================================
    // 2. CONTROLADOR DE ESTADOS DEL AVATAR (setCallAvatarState)
    // ========================================================================
    function setCallAvatarState(newState) {
        if (!newState || CALL_STATES.indexOf(newState) === -1) {
            newState = 'IDLE';
        }
        estadoActual = newState;

        if (avatarEl) {
            avatarEl.setAttribute('data-state', newState);
        }

        // Chispa / emoji flotante
        if (sparkEl) {
            var sparkEmoji = SPARKS[newState] || '';
            if (sparkEmoji) {
                sparkEl.textContent = sparkEmoji;
                sparkEl.classList.add('show');
            } else {
                sparkEl.classList.remove('show');
            }
        }

        // Sonidos de expresión sutiles automáticos según el estado
        if (newState === 'THINKING') {
            if (Math.random() < 0.45) playCallExpressionSound('hmm');
        } else if (newState === 'SURPRISED') {
            playCallExpressionSound('surprise');
        } else if (newState === 'LAUGHING') {
            playCallExpressionSound('laugh');
        } else if (newState === 'TIRED') {
            playCallExpressionSound('sigh');
        } else if (newState === 'SLEEPING') {
            playCallExpressionSound('yawn');
        }

        // Si cambia a no-hablar, cerramos la boca progresivamente
        if (newState !== 'SPEAKING') {
            detenerLipSync();
        } else {
            iniciarLipSync();
        }

        // Actualizar indicador de estado en la UI de llamada
        actualizarIndicadorTexto(newState);
    }

    function actualizarIndicadorTexto(st) {
        var badge = document.getElementById('ia-call-state-badge');
        var sub = document.getElementById('ia-call-subtitle');
        if (!badge && !sub) return;

        var txt = '';
        if (isMicMuted) {
            txt = '🔇 Micrófono silenciado';
        } else if (st === 'LISTENING') {
            txt = '🎙️ Te escucho... habla ahora';
        } else if (st === 'THINKING') {
            txt = '⚡ Pensando en tu respuesta...';
        } else if (st === 'SPEAKING') {
            txt = '🔊 Osito está hablando...';
        } else if (st === 'HAPPY' || st === 'EXCITED' || st === 'LAUGHING') {
            txt = '✨ ¡Qué divertido platicar contigo!';
        } else if (st === 'SURPRISED') {
            txt = '😲 ¡Vaya sorpresa!';
        } else if (st === 'CONFUSED') {
            txt = '🤔 Cuéntame un poquito más...';
        } else {
            txt = '🎙️ Modo voz en vivo con Osito';
        }

        if (badge) badge.textContent = txt;
        if (sub && (st === 'LISTENING' || st === 'THINKING')) {
            sub.textContent = txt;
        }
    }

    // ========================================================================
    // 3. ANIMACIONES NATURALES IDLE Y PARPADEO
    // ========================================================================
    function iniciarAnimacionesIdle() {
        detenerAnimacionesIdle();

        // Parpadeo natural cada 3.5 a 6 segundos
        function programarParpadeo() {
            var ms = 3200 + Math.random() * 2800;
            idleBlinkTimer = setTimeout(function () {
                if (avatarEl && (estadoActual === 'IDLE' || estadoActual === 'LISTENING' || estadoActual === 'SPEAKING')) {
                    avatarEl.classList.add('blinking');
                    setTimeout(function () {
                        if (avatarEl) avatarEl.classList.remove('blinking');
                    }, 120);
                }
                programarParpadeo();
            }, ms);
        }
        programarParpadeo();

        // Miradas y pequeños movimientos naturales de ojos en Idle
        function programarMirada() {
            var ms = 4500 + Math.random() * 3500;
            idleGlanceTimer = setTimeout(function () {
                if (avatarEl && estadoActual === 'IDLE') {
                    var pupils = avatarEl.querySelectorAll('.call-eye-pupil');
                    var dirX = (Math.random() - 0.5) * 8;
                    var dirY = (Math.random() - 0.5) * 4;
                    pupils.forEach(function (p) {
                        p.style.transform = 'translate(' + dirX.toFixed(1) + 'px, ' + dirY.toFixed(1) + 'px)';
                    });

                    setTimeout(function () {
                        pupils.forEach(function (p) {
                            p.style.transform = 'translate(0, 0)';
                        });
                    }, 1400);
                }
                programarMirada();
            }, ms);
        }
        programarMirada();
    }

    function detenerAnimacionesIdle() {
        if (idleBlinkTimer) { clearTimeout(idleBlinkTimer); idleBlinkTimer = null; }
        if (idleGlanceTimer) { clearTimeout(idleGlanceTimer); idleGlanceTimer = null; }
        if (idleExpressionTimer) { clearTimeout(idleExpressionTimer); idleExpressionTimer = null; }
    }

    // ========================================================================
    // 4. LIP-SYNC MEDIANTE WEB AUDIO API / ANALYSER
    // ========================================================================
    function asegurarAudioContext() {
        if (!audioCtx) {
            var C = window.AudioContext || window.webkitAudioContext;
            if (C) {
                try {
                    audioCtx = new C();
                } catch (_) {}
            }
        }
        if (audioCtx && audioCtx.state === 'suspended') {
            audioCtx.resume().catch(function () {});
        }
        return audioCtx;
    }

    function iniciarLipSync() {
        isSpeakingAudio = true;
        if (lipSyncAnimId) return;

        var openAmount = 0;
        var targetOpen = 0;
        var stepCount = 0;

        function loopLipSync() {
            if (!isSpeakingAudio || estadoActual !== 'SPEAKING') {
                // Cerrar la boca suavemente
                openAmount += (0 - openAmount) * 0.25;
                if (mouthEl) mouthEl.style.setProperty('--call-mouth-open', openAmount.toFixed(2));
                if (openAmount > 0.02) {
                    lipSyncAnimId = requestAnimationFrame(loopLipSync);
                } else {
                    lipSyncAnimId = null;
                    if (mouthEl) mouthEl.style.setProperty('--call-mouth-open', '0');
                }
                return;
            }

            // Simulación de energía fonética suave / o análisis de audio
            stepCount++;
            if (stepCount % 5 === 0) {
                targetOpen = Math.random() < 0.2 ? 0.05 : 0.35 + Math.random() * 0.65;
            }
            openAmount += (targetOpen - openAmount) * 0.38;

            if (mouthEl) {
                mouthEl.style.setProperty('--call-mouth-open', openAmount.toFixed(2));
            }

            lipSyncAnimId = requestAnimationFrame(loopLipSync);
        }

        lipSyncAnimId = requestAnimationFrame(loopLipSync);
    }

    function detenerLipSync() {
        isSpeakingAudio = false;
        // El bucle de arriba se encargará de cerrarla suavemente
    }

    // ========================================================================
    // 5. SONIDOS DE EXPRESIÓN DE LLAMADA (playCallExpressionSound)
    // ========================================================================
    function playCallExpressionSound(type) {
        // No reproducir sonidos si la IA está hablando o el audio está apagado
        if (estadoActual === 'SPEAKING' || isSpeakingAudio) return;

        var ctx = asegurarAudioContext();
        if (!ctx) return;

        try {
            var t0 = ctx.currentTime;
            var masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.0001, t0);
            masterGain.connect(ctx.destination);

            if (type === 'hmm') {
                // "Hmm" curioso de tono ascendente suave
                masterGain.gain.exponentialRampToValueAtTime(0.08, t0 + 0.06);
                masterGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.35);

                var osc = ctx.createOscillator();
                osc.type = 'triangle';
                osc.frequency.setValueAtTime(220, t0);
                osc.frequency.exponentialRampToValueAtTime(270, t0 + 0.3);
                osc.connect(masterGain);
                osc.start(t0);
                osc.stop(t0 + 0.36);

            } else if (type === 'ah' || type === 'surprise') {
                // "¡Ah!" de sorpresa
                masterGain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.04);
                masterGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.28);

                var oscS = ctx.createOscillator();
                oscS.type = 'sine';
                oscS.frequency.setValueAtTime(320, t0);
                oscS.frequency.exponentialRampToValueAtTime(440, t0 + 0.12);
                oscS.frequency.exponentialRampToValueAtTime(380, t0 + 0.26);
                oscS.connect(masterGain);
                oscS.start(t0);
                oscS.stop(t0 + 0.29);

            } else if (type === 'laugh') {
                // Risita cariñosa (3 pulsos rápidos)
                [0, 0.09, 0.18].forEach(function (dt, i) {
                    var g = ctx.createGain();
                    g.gain.setValueAtTime(0.0001, t0 + dt);
                    g.gain.exponentialRampToValueAtTime(0.07, t0 + dt + 0.02);
                    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.07);
                    g.connect(masterGain);

                    var oscL = ctx.createOscillator();
                    oscL.type = 'triangle';
                    oscL.frequency.setValueAtTime(360 + i * 30, t0 + dt);
                    oscL.connect(g);
                    oscL.start(t0 + dt);
                    oscL.stop(t0 + dt + 0.08);
                });
                masterGain.gain.setValueAtTime(1, t0);

            } else if (type === 'sigh' || type === 'yawn') {
                // Suspiro o bostezo descendente suave
                masterGain.gain.exponentialRampToValueAtTime(0.06, t0 + 0.1);
                masterGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.55);

                var oscY = ctx.createOscillator();
                oscY.type = 'sine';
                oscY.frequency.setValueAtTime(340, t0);
                oscY.frequency.exponentialRampToValueAtTime(210, t0 + 0.5);
                oscY.connect(masterGain);
                oscY.start(t0);
                oscY.stop(t0 + 0.56);
            }
        } catch (_) {}
    }

    // ========================================================================
    // 6. CONTROLADOR DE MICRÓFONO: MUTE / UNMUTE
    // ========================================================================
    function toggleMute() {
        setMute(!isMicMuted);
    }

    function setMute(muted) {
        isMicMuted = Boolean(muted);

        if (micBtn) {
            micBtn.classList.toggle('call-mic-muted', isMicMuted);
        }
        if (micLabel) {
            micLabel.textContent = isMicMuted ? '🔇 Micrófono silenciado' : '🎙️ Micrófono';
        }

        var micWaves = document.getElementById('call-mic-waves');
        if (micWaves) {
            micWaves.style.display = isMicMuted ? 'none' : 'inline-flex';
        }

        if (isMicMuted) {
            // Detener la escucha activa sin colgar ni silenciar a Gemini
            if (window.voiceAssistant && typeof window.voiceAssistant.stopListening === 'function') {
                window.voiceAssistant.stopListening();
            }
            if (estadoActual === 'LISTENING') {
                setCallAvatarState('IDLE');
            }
            actualizarIndicadorTexto('MUTED');
            if (typeof showToast === 'function') showToast('🔇 Micrófono silenciado (Tú sigues escuchando a Osito)');
        } else {
            // Reactivar el micrófono del usuario si corresponde
            if (estadoActual !== 'SPEAKING') {
                setCallAvatarState('LISTENING');
                if (window.voiceAssistant && typeof window.voiceAssistant.startListening === 'function') {
                    window.voiceAssistant.startListening(true);
                }
            }
            actualizarIndicadorTexto(estadoActual);
            if (typeof showToast === 'function') showToast('🎙️ Micrófono activado');
        }
    }

    // ========================================================================
    // 7. GESTOR DE CÁMARA & VISIÓN EN TIEMPO REAL
    // ========================================================================
    async function toggleCamara() {
        if (isCameraActive) {
            desactivarCamara();
        } else {
            solicitarYActivarCamara();
        }
    }

    async function solicitarYActivarCamara() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (typeof showToast === 'function') showToast('Tu navegador no soporta acceso a la cámara.');
            return;
        }

        // Confirmación interactiva previa
        var permitir = window.confirm('Osito quiere usar tu cámara para poder ver lo que le muestras durante la llamada. ¿Permitir acceso a la cámara?');
        if (!permitir) {
            if (typeof showToast === 'function') showToast('Acceso a cámara cancelado.');
            return;
        }

        try {
            var stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: 'user',
                    width: { ideal: 640 },
                    height: { ideal: 480 }
                },
                audio: false
            });

            cameraStream = stream;
            isCameraActive = true;

            if (camBox) camBox.hidden = false;
            if (camVideo) {
                camVideo.srcObject = stream;
                camVideo.play().catch(function () {});
            }

            if (camBtn) {
                camBtn.classList.add('call-camera-active');
                var lbl = document.getElementById('ia-call-cam-label');
                if (lbl) lbl.textContent = 'Cámara On';
            }

            setCallAvatarState('SURPRISED');
            playCallExpressionSound('surprise');
            mostrarRespuestaTexto('¡Woooow! Ya puedo ver lo que me estás mostrando por la cámara. ¿Qué tienes ahí? 👀');
            hablarRespuesta('¡Woooow! Ya puedo ver lo que me estás mostrando por la cámara. ¿Qué tienes ahí?');

            iniciarCapturaFramesPeriodica();
            if (typeof showToast === 'function') showToast('👁️ Osito está viendo tu cámara');
        } catch (err) {
            console.warn('[CallCameraManager] Error solicitando cámara:', err);
            isCameraActive = false;
            if (typeof showToast === 'function') {
                showToast('No se pudo acceder a la cámara. Revisa los permisos.');
            }
        }
    }

    function desactivarCamara() {
        if (frameCaptureTimer) {
            clearInterval(frameCaptureTimer);
            frameCaptureTimer = null;
        }

        if (cameraStream) {
            try {
                cameraStream.getTracks().forEach(function (track) { track.stop(); });
            } catch (_) {}
            cameraStream = null;
        }

        isCameraActive = false;
        latestFrameBase64 = null;

        if (camVideo) {
            camVideo.srcObject = null;
        }
        if (camBox) {
            camBox.hidden = true;
        }
        if (camBtn) {
            camBtn.classList.remove('call-camera-active');
            var lbl = document.getElementById('ia-call-cam-label');
            if (lbl) lbl.textContent = 'Cámara';
        }

        if (typeof showToast === 'function') showToast('Cámara apagada');
    }

    function capturarFrameActual() {
        if (!isCameraActive || !camVideo || camVideo.readyState < 2) return null;
        try {
            var c = document.createElement('canvas');
            c.width = 480;
            c.height = Math.round((480 * (camVideo.videoHeight || 360)) / (camVideo.videoWidth || 480));
            var ctx = c.getContext('2d');
            ctx.drawImage(camVideo, 0, 0, c.width, c.height);
            var base64 = c.toDataURL('image/jpeg', 0.82);
            latestFrameBase64 = base64;
            return base64;
        } catch (e) {
            return null;
        }
    }

    function iniciarCapturaFramesPeriodica() {
        if (frameCaptureTimer) clearInterval(frameCaptureTimer);
        // Cada 2.5s se renueva el frame en memoria para cuando el usuario pregunte
        frameCaptureTimer = setInterval(function () {
            if (isCameraActive) {
                capturarFrameActual();
            }
        }, 2500);
    }

    // ========================================================================
    // 8. TRANSCRIPCIÓN Y RESPUESTAS DE TEXTO
    // ========================================================================
    function mostrarTranscripcionUsuario(texto) {
        if (!texto) return;
        if (transcriptUserEl) transcriptUserEl.textContent = texto;
        if (transcriptUserBox) transcriptUserBox.hidden = false;
    }

    function mostrarRespuestaTexto(texto) {
        if (!texto) return;
        if (responseTextEl) responseTextEl.textContent = texto;
        if (responseBox) {
            responseBox.scrollTop = responseBox.scrollHeight;
        }
    }

    // ========================================================================
    // 9. CONVERSACIÓN GEMINI LIVE & PROCESAMIENTO MULTIMODAL
    // ========================================================================
    async function procesarEntradaUsuario(preguntaUsuario) {
        var limpia = String(preguntaUsuario || '').trim();
        if (!limpia) return;

        hasUserSpoke = true;
        mostrarTranscripcionUsuario(limpia);
        setCallAvatarState('THINKING');

        // Si la cámara está activa, capturamos el frame más reciente
        var fotoAEnviar = isCameraActive ? capturarFrameActual() : null;

        try {
            var respuesta = null;

            if (window.OsitoIA && typeof window.OsitoIA.preguntar === 'function') {
                var res = await window.OsitoIA.preguntar(limpia, {
                    imagen: fotoAEnviar,
                    nombre: localStorage.getItem('osito_ai_nombre') || '',
                    genero: localStorage.getItem('osito_ai_genero') || 'male'
                });
                if (res && res.texto) {
                    respuesta = res.texto;
                }
            }

            if (!respuesta) {
                if (window.OsitoConocimiento && typeof window.OsitoConocimiento.buscarEnBaseConocimiento === 'function') {
                    respuesta = window.OsitoConocimiento.buscarEnBaseConocimiento(limpia);
                }
            }

            if (!respuesta) {
                respuesta = '¡Te escucho clarito! Sigue platicando conmigo o muéstrame algo a tu cámara.';
            }

            mostrarRespuestaTexto(respuesta);
            hablarRespuesta(respuesta);
        } catch (err) {
            console.error('[CallModeEngine] Error procesando Gemini:', err);
            setCallAvatarState('IDLE');
        }
    }

    function hablarRespuesta(texto) {
        setCallAvatarState('SPEAKING');

        if (typeof window.hablarIA === 'function') {
            window.hablarIA(texto);
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            var utt = new SpeechSynthesisUtterance(texto);
            utt.lang = 'es-MX';
            utt.onend = function () {
                if (window.ositoEnLlamadaIA) {
                    setCallAvatarState('IDLE');
                }
            };
            window.speechSynthesis.speak(utt);
        }
    }

    // ========================================================================
    // 10. CICLO DE VIDA: INICIAR Y FINALIZAR LLAMADA
    // ========================================================================
    function iniciarLlamada() {
        inicializarElementos();
        asegurarAudioContext();

        // Ocultar cualquier cubo que hubiera en el área de llamada
        var orbStage = document.querySelector('.ia-call-orb-stage');
        if (orbStage) {
            var oldOrb = orbStage.querySelector('.osito-face');
            if (oldOrb) oldOrb.style.display = 'none';
        }

        isMicMuted = false;
        hasUserSpoke = false;

        setMute(false);
        setCallAvatarState('SPEAKING');
        iniciarAnimacionesIdle();

        // Saludo inicial de llamada
        var saludo = '¡Hola! Ya estamos en modo llamada con voz en vivo. Puedes platicar conmigo o activar la cámara con el botón 📷.';
        mostrarRespuestaTexto(saludo);
    }

    function finalizarLlamada() {
        detenerAnimacionesIdle();
        detenerLipSync();
        desactivarCamara();

        isSpeakingAudio = false;
        isMicMuted = false;

        // Cancelar síntesis de voz en llamada
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        // Restablecer estados del CallAvatar
        if (avatarEl) {
            avatarEl.setAttribute('data-state', 'IDLE');
            avatarEl.classList.remove('blinking');
        }
        if (mouthEl) {
            mouthEl.style.setProperty('--call-mouth-open', '0');
        }
        if (sparkEl) {
            sparkEl.classList.remove('show');
            sparkEl.textContent = '';
        }

        // Limpiar transcripciones
        if (transcriptUserBox) transcriptUserBox.hidden = true;
        if (transcriptUserEl) transcriptUserEl.textContent = '';
    }

    // Sincronización con eventos globales de TTS y Asistente de Voz
    document.addEventListener('osito:tts-start', function () {
        if (!window.ositoEnLlamadaIA) return;
        setCallAvatarState('SPEAKING');
    });

    document.addEventListener('osito:tts-end', function () {
        if (!window.ositoEnLlamadaIA) return;
        setCallAvatarState('IDLE');
        // Si no está muteado, dar turno de escucha al usuario
        if (!isMicMuted) {
            setTimeout(function () {
                if (window.ositoEnLlamadaIA && !isMicMuted && estadoActual === 'IDLE') {
                    setCallAvatarState('LISTENING');
                    if (window.voiceAssistant && typeof window.voiceAssistant.startListening === 'function') {
                        window.voiceAssistant.startListening(true);
                    }
                }
            }, 300);
        }
    });

    document.addEventListener('voiceassistant:state', function (e) {
        if (!window.ositoEnLlamadaIA) return;
        var st = e && e.detail && e.detail.state;
        if (isMicMuted && st === 'listening') return;

        if (st === 'listening') {
            setCallAvatarState('LISTENING');
        } else if (st === 'processing') {
            setCallAvatarState('THINKING');
        } else if (st === 'speaking') {
            setCallAvatarState('SPEAKING');
        }
    });

    // Escuchar transcripciones del usuario en vivo
    document.addEventListener('voiceassistant:transcript', function (e) {
        if (!window.ositoEnLlamadaIA) return;
        var txt = e && e.detail && e.detail.text;
        if (txt) {
            mostrarTranscripcionUsuario(txt);
        }
    });

    // Exportar API exclusiva de llamada
    global.CallModeEngine = {
        iniciarLlamada: iniciarLlamada,
        finalizarLlamada: finalizarLlamada,
        setCallAvatarState: setCallAvatarState,
        playCallExpressionSound: playCallExpressionSound,
        setMute: setMute,
        toggleMute: toggleMute,
        toggleCamara: toggleCamara,
        capturarFrame: capturarFrameActual,
        mostrarRespuestaTexto: mostrarRespuestaTexto,
        mostrarTranscripcionUsuario: mostrarTranscripcionUsuario,
        procesarEntradaUsuario: procesarEntradaUsuario,
        isMuted: function () { return isMicMuted; },
        isCameraActive: function () { return isCameraActive; }
    };

})(window);
