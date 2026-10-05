/**
 * ============================================================================
 * CALL MODE ENGINE — MODO LLAMADA AISLADO CON AVATAR 2D CIRCULAR
 * ============================================================================
 * Este archivo pertenece EXCLUSIVAMENTE al modo llamada / voz en vivo.
 *
 * MODO NORMAL:
 *   - El cubo 3D y sus animaciones, expresiones, sonidos y personalidades
 *     permanecen 100% intactos e independientes.
 *
 * MODO LLAMADA:
 *   - El personaje principal es un AVATAR 2D CIRCULAR interactivo.
 *   - Estados: IDLE, LISTENING, THINKING, SPEAKING, HAPPY, SAD, SURPRISED,
 *     CONFUSED, LAUGHING, EXCITED, TIRED, SLEEPING.
 *   - Boca con Lip-Sync REAL mediante Web Audio API AnalyserNode.
 *   - Sonidos y expresiones naturales ("ah", "mmm", suspiro, bostezo, risa).
 *   - Conversación en tiempo real con Gemini Live (Voz + Texto progresivo).
 *   - Cámara real mediante navigator.mediaDevices.getUserMedia con visión.
 *   - Mute real y finalización limpia con retorno al cubo del modo normal.
 * ============================================================================
 */
(function (global) {
    'use strict';

    // --- 1. ESTADOS DEL AVATAR CIRCULAR ---
    var CALL_STATES = [
        'IDLE', 'LISTENING', 'THINKING', 'SPEAKING',
        'HAPPY', 'SAD', 'SURPRISED', 'CONFUSED',
        'LAUGHING', 'EXCITED', 'TIRED', 'SLEEPING'
    ];

    var estadoActual = 'IDLE';
    var isCallActive = false;

    // Elementos del DOM del modo llamada
    var avatarEl = null;
    var mouthEl = null;
    var sparkEl = null;
    var transcriptUserEl = null;
    var transcriptUserBox = null;
    var responseTextEl = null;
    var responseBox = null;
    var micBtn = null;
    var micLabel = null;
    var micWaves = null;
    var camBtn = null;
    var camLabel = null;
    var camBox = null;
    var camVideo = null;
    var stateBadgeEl = null;

    // Estado del Micrófono y Mute
    var isMicMuted = false;
    var recognitionInstance = null;

    // Estado de la Cámara Real y Visión
    var cameraStream = null;
    var isCameraActive = false;
    var latestFrameBase64 = null;
    var frameCaptureTimer = null;

    // Web Audio API para Lip-Sync y Sonidos de Expresión
    var audioCtx = null;
    var analyser = null;
    var lipSyncAnimId = null;
    var currentMouthOpen = 0;
    var isSpeakingAudio = false;
    var vocalCarrierNode = null;
    var vocalGainNode = null;

    // Timers de animación natural Idle
    var idleBlinkTimer = null;
    var idleGlanceTimer = null;
    var inactivityTimer = null;
    var textStreamTimer = null;

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
    // 2. INICIALIZACIÓN Y MONTAJE DEL COMPONENTE DE LLAMADA
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
        micWaves = document.getElementById('call-mic-waves');
        camBtn = document.getElementById('ia-call-cam-btn');
        camLabel = document.getElementById('ia-call-cam-label');
        camBox = document.getElementById('call-camera-preview-box');
        camVideo = document.getElementById('call-camera-video');
        stateBadgeEl = document.getElementById('ia-call-state-badge');

        var camCloseBtn = document.getElementById('call-camera-close-btn');
        if (camCloseBtn) {
            camCloseBtn.onclick = function (e) {
                e.stopPropagation();
                desactivarCamara();
            };
        }

        if (camBtn) {
            camBtn.onclick = function (e) {
                e.preventDefault();
                toggleCamara();
            };
        }

        if (micBtn) {
            micBtn.onclick = function (e) {
                e.preventDefault();
                toggleMute();
            };
        }

        var avatarStage = document.getElementById('call-avatar-stage');
        if (avatarStage) {
            avatarStage.onclick = function () {
                if (estadoActual === 'IDLE' || estadoActual === 'TIRED' || estadoActual === 'SLEEPING') {
                    setCallAvatarState('HAPPY');
                    playCallExpressionSound('laugh');
                    setTimeout(function () {
                        if (isCallActive && estadoActual === 'HAPPY') {
                            setCallAvatarState('IDLE');
                        }
                    }, 1500);
                }
            };
        }
    }

    // ========================================================================
    // 3. CONTROLADOR DE ESTADOS DEL AVATAR (setCallAvatarState)
    // ========================================================================
    function setCallAvatarState(newState) {
        if (!newState || CALL_STATES.indexOf(newState) === -1) {
            newState = 'IDLE';
        }
        estadoActual = newState;

        if (avatarEl) {
            avatarEl.setAttribute('data-state', newState);
        }

        var mascotFace = document.getElementById('call-mascot-cube-face');
        if (mascotFace) {
            var mapStateToCube = {
                IDLE: 'idle',
                LISTENING: 'listening',
                THINKING: 'thinking',
                SPEAKING: 'speaking',
                HAPPY: 'happy',
                SAD: 'sad',
                SURPRISED: 'surprised',
                CONFUSED: 'confused',
                LAUGHING: 'happy',
                EXCITED: 'happy',
                TIRED: 'sleepy',
                SLEEPING: 'sleepy'
            };
            mascotFace.setAttribute('data-estado', mapStateToCube[newState] || 'idle');
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

        // Sonidos de expresión sutiles según el estado
        if (newState === 'THINKING') {
            if (Math.random() < 0.5) playCallExpressionSound('mmm');
        } else if (newState === 'SURPRISED') {
            playCallExpressionSound('ah');
        } else if (newState === 'LAUGHING') {
            playCallExpressionSound('laugh');
        } else if (newState === 'TIRED') {
            playCallExpressionSound('sigh');
        } else if (newState === 'SLEEPING') {
            playCallExpressionSound('sleep');
        }

        // Control del bucle de Lip-Sync
        if (newState === 'SPEAKING') {
            iniciarLipSync();
        } else {
            detenerLipSync();
        }

        // Reiniciar timer de inactividad
        reiniciarInactividad();

        // Actualizar etiqueta descriptiva en la UI
        actualizarIndicadorTexto(newState);
    }

    function actualizarIndicadorTexto(st) {
        if (!stateBadgeEl) stateBadgeEl = document.getElementById('ia-call-state-badge');
        if (!stateBadgeEl) return;

        var txt = '';
        if (isMicMuted) {
            txt = '🔇 Micrófono silenciado · Tú sigues escuchando a Osito';
        } else if (st === 'LISTENING') {
            txt = '🎙️ Te escucho... habla con naturalidad';
        } else if (st === 'THINKING') {
            txt = '⚡ Osito está procesando tu respuesta...';
        } else if (st === 'SPEAKING') {
            txt = '🔊 Osito está hablando...';
        } else if (st === 'HAPPY' || st === 'EXCITED') {
            txt = '✨ ¡Qué divertido conversar contigo!';
        } else if (st === 'LAUGHING') {
            txt = '😂 ¡Jajaja, qué buen chiste!';
        } else if (st === 'SURPRISED') {
            txt = '😲 ¡Vaya sorpresa! Observando atento...';
        } else if (st === 'CONFUSED') {
            txt = '🤔 Cuéntame un poquito más de eso...';
        } else if (st === 'SAD') {
            txt = '💧 Entiendo cómo te sientes, aquí estoy para ti.';
        } else if (st === 'TIRED') {
            txt = '🥱 Me está dando un poco de sueño...';
        } else if (st === 'SLEEPING') {
            txt = '💤 Osito se quedó dormidito (háblale para despertarlo)';
        } else {
            txt = '🎙️ Voz en vivo activa con Osito';
        }

        stateBadgeEl.textContent = txt;
    }

    // ========================================================================
    // 4. ANIMACIONES NATURALES: PARPADEO, MIRADA Y SUEÑO
    // ========================================================================
    function iniciarAnimacionesIdle() {
        detenerAnimacionesIdle();

        // Parpadeo natural cada 3.2 a 5.8 segundos
        function programarParpadeo() {
            var ms = 3200 + Math.random() * 2600;
            idleBlinkTimer = setTimeout(function () {
                if (avatarEl && (estadoActual === 'IDLE' || estadoActual === 'LISTENING' || estadoActual === 'SPEAKING')) {
                    avatarEl.classList.add('blinking');
                    setTimeout(function () {
                        if (avatarEl) avatarEl.classList.remove('blinking');
                    }, 130);
                }
                if (isCallActive) programarParpadeo();
            }, ms);
        }
        programarParpadeo();

        // Miradas y pequeños movimientos naturales de ojos en Idle
        function programarMirada() {
            var ms = 4200 + Math.random() * 3200;
            idleGlanceTimer = setTimeout(function () {
                if (avatarEl && (estadoActual === 'IDLE' || estadoActual === 'LISTENING')) {
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
                if (isCallActive) programarMirada();
            }, ms);
        }
        programarMirada();

        reiniciarInactividad();
    }

    function reiniciarInactividad() {
        if (inactivityTimer) clearTimeout(inactivityTimer);
        if (!isCallActive) return;

        // Si nadie habla por 50 segundos, Osito bosteza (TIRED)
        inactivityTimer = setTimeout(function () {
            if (isCallActive && estadoActual === 'IDLE') {
                setCallAvatarState('TIRED');
                inactivityTimer = setTimeout(function () {
                    if (isCallActive && estadoActual === 'TIRED') {
                        setCallAvatarState('SLEEPING');
                    }
                }, 14000);
            }
        }, 50000);
    }

    function detenerAnimacionesIdle() {
        if (idleBlinkTimer) { clearTimeout(idleBlinkTimer); idleBlinkTimer = null; }
        if (idleGlanceTimer) { clearTimeout(idleGlanceTimer); idleGlanceTimer = null; }
        if (inactivityTimer) { clearTimeout(inactivityTimer); inactivityTimer = null; }
    }

    // ========================================================================
    // 5. LIP-SYNC MEDIANTE WEB AUDIO API / ANALYSERNODE REAL
    // ========================================================================
    function asegurarAudioContext() {
        if (!audioCtx) {
            var AudioContextClass = window.AudioContext || window.webkitAudioContext;
            if (AudioContextClass) {
                try {
                    audioCtx = new AudioContextClass();
                    analyser = audioCtx.createAnalyser();
                    analyser.fftSize = 256;
                    analyser.smoothingTimeConstant = 0.35;
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
        asegurarAudioContext();
        if (lipSyncAnimId) return;

        var freqData = analyser ? new Uint8Array(analyser.frequencyBinCount) : null;
        var synthPhase = 0;

        function loopLipSync() {
            if (!isCallActive || !isSpeakingAudio || estadoActual !== 'SPEAKING') {
                // Cerrar la boca suavemente
                currentMouthOpen += (0 - currentMouthOpen) * 0.3;
                if (mouthEl) {
                    mouthEl.style.setProperty('--call-mouth-open', currentMouthOpen.toFixed(3));
                }
                if (currentMouthOpen > 0.02) {
                    lipSyncAnimId = requestAnimationFrame(loopLipSync);
                } else {
                    lipSyncAnimId = null;
                    if (mouthEl) mouthEl.style.setProperty('--call-mouth-open', '0');
                }
                return;
            }

            var targetOpen = 0;

            if (analyser && freqData) {
                analyser.getByteFrequencyData(freqData);
                var sum = 0;
                var count = 0;
                // Examinar rango vocal humano (bins 2 a 32 ~ 150Hz - 2800Hz)
                for (var i = 2; i < Math.min(freqData.length, 36); i++) {
                    sum += freqData[i];
                    count++;
                }
                var avg = count > 0 ? (sum / count) : 0;
                if (avg > 14) {
                    targetOpen = Math.min(1.0, Math.max(0, (avg - 14) / 70));
                }
            }

            // Si el speech synthesis no pasa por AnalyserNode directamente,
            // modular armónicamente la cadencia vocal acústica
            if (targetOpen < 0.08 && window.speechSynthesis && window.speechSynthesis.speaking) {
                synthPhase += 0.35;
                var baseCadence = (Math.sin(synthPhase) + 1) * 0.38;
                var formantFlicker = (Math.sin(synthPhase * 2.3) + 1) * 0.15;
                targetOpen = Math.min(0.9, baseCadence + formantFlicker);
            }

            // Interpolación elástica suave
            currentMouthOpen += (targetOpen - currentMouthOpen) * 0.42;
            if (mouthEl) {
                mouthEl.style.setProperty('--call-mouth-open', currentMouthOpen.toFixed(3));
            }

            lipSyncAnimId = requestAnimationFrame(loopLipSync);
        }

        lipSyncAnimId = requestAnimationFrame(loopLipSync);
    }

    function detenerLipSync() {
        isSpeakingAudio = false;
        // loopLipSync cerrará la boca suavemente hacia 0
    }

    // ========================================================================
    // 6. VOCALIZACIONES NATURALES / SONIDOS DE EXPRESIÓN
    // ========================================================================
    var lastSoundTime = 0;
    function playCallExpressionSound(type) {
        if (!isCallActive || isSpeakingAudio) return;
        var now = Date.now();
        if (now - lastSoundTime < 1800) return; // evitar saturación
        lastSoundTime = now;

        var ctx = asegurarAudioContext();
        if (!ctx) return;

        try {
            var t0 = ctx.currentTime;
            var masterGain = ctx.createGain();
            masterGain.gain.setValueAtTime(0.0001, t0);
            masterGain.connect(analyser || ctx.destination);
            if (analyser) analyser.connect(ctx.destination);

            if (type === 'mmm') {
                // "Mmm" reflexivo ascendente suave
                masterGain.gain.exponentialRampToValueAtTime(0.09, t0 + 0.05);
                masterGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.38);

                var oscM = ctx.createOscillator();
                oscM.type = 'triangle';
                oscM.frequency.setValueAtTime(220, t0);
                oscM.frequency.exponentialRampToValueAtTime(285, t0 + 0.32);
                oscM.connect(masterGain);
                oscM.start(t0);
                oscM.stop(t0 + 0.4);

            } else if (type === 'ah') {
                // "¡Ah!" de sorpresa alegre
                masterGain.gain.exponentialRampToValueAtTime(0.11, t0 + 0.04);
                masterGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.32);

                var oscA = ctx.createOscillator();
                oscA.type = 'sine';
                oscA.frequency.setValueAtTime(310, t0);
                oscA.frequency.exponentialRampToValueAtTime(450, t0 + 0.14);
                oscA.frequency.exponentialRampToValueAtTime(390, t0 + 0.3);
                oscA.connect(masterGain);
                oscA.start(t0);
                oscA.stop(t0 + 0.33);

            } else if (type === 'laugh') {
                // Risa corta cariñosa (3 pulsos rápidos)
                [0, 0.09, 0.18].forEach(function (dt, i) {
                    var g = ctx.createGain();
                    g.gain.setValueAtTime(0.0001, t0 + dt);
                    g.gain.exponentialRampToValueAtTime(0.08, t0 + dt + 0.02);
                    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dt + 0.07);
                    g.connect(masterGain);

                    var oscL = ctx.createOscillator();
                    oscL.type = 'triangle';
                    oscL.frequency.setValueAtTime(360 + i * 35, t0 + dt);
                    oscL.connect(g);
                    oscL.start(t0 + dt);
                    oscL.stop(t0 + dt + 0.08);
                });
                masterGain.gain.setValueAtTime(1, t0);

            } else if (type === 'sigh' || type === 'sleep') {
                // Suspiro o bostezo descendente
                masterGain.gain.exponentialRampToValueAtTime(0.07, t0 + 0.1);
                masterGain.gain.exponentialRampToValueAtTime(0.0001, t0 + 0.6);

                var oscS = ctx.createOscillator();
                oscS.type = 'sine';
                oscS.frequency.setValueAtTime(360, t0);
                oscS.frequency.exponentialRampToValueAtTime(220, t0 + 0.55);
                oscS.connect(masterGain);
                oscS.start(t0);
                oscS.stop(t0 + 0.62);
            }
        } catch (_) {}
    }

    // ========================================================================
    // 7. CONTROLADOR DE MICRÓFONO: MUTE / UNMUTE
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
            micLabel.textContent = isMicMuted ? 'Silenciado' : 'Micrófono';
        }
        if (micWaves) {
            micWaves.style.display = isMicMuted ? 'none' : 'inline-flex';
        }

        if (isMicMuted) {
            // Detener el reconocimiento sin cerrar la llamada ni silenciar a Osito
            if (window.voiceAssistant && typeof window.voiceAssistant.stopListening === 'function') {
                window.voiceAssistant.stopListening();
            }
            if (estadoActual === 'LISTENING') {
                setCallAvatarState('IDLE');
            }
            actualizarIndicadorTexto('MUTED');
            if (typeof showToast === 'function') {
                showToast('🔇 Micrófono silenciado');
            }
        } else {
            // Reactivar micrófono
            if (estadoActual !== 'SPEAKING') {
                setCallAvatarState('LISTENING');
                if (window.voiceAssistant && typeof window.voiceAssistant.startListening === 'function') {
                    window.voiceAssistant.startListening(true);
                }
            }
            actualizarIndicadorTexto(estadoActual);
            if (typeof showToast === 'function') {
                showToast('🎙️ Micrófono activado');
            }
        }
    }

    // ========================================================================
    // 8. CÁMARA REAL & VISIÓN EN TIEMPO REAL CON GEMINI
    // ========================================================================
    async function toggleCamara() {
        if (isCameraActive) {
            desactivarCamara();
        } else {
            await activarCamaraReal();
        }
    }

    async function activarCamaraReal() {
        if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
            if (typeof showToast === 'function') {
                showToast('Tu dispositivo no soporta acceso a la cámara.');
            }
            return;
        }

        try {
            // Solicitar el permiso REAL del navegador (muestra el cuadro de diálogo nativo)
            var stream = await navigator.mediaDevices.getUserMedia({
                video: {
                    facingMode: { ideal: 'user' },
                    width: { ideal: 1280 },
                    height: { ideal: 720 }
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
            }
            if (camLabel) {
                camLabel.textContent = 'Cámara On';
            }

            setCallAvatarState('SURPRISED');
            playCallExpressionSound('ah');

            var textoBienvenidaCam = '¡Woooow! Ya puedo ver lo que me muestras por tu cámara. ¡Enséñame lo que tienes ahí! 👀';
            mostrarRespuestaTexto(textoBienvenidaCam);
            hablarRespuesta(textoBienvenidaCam);

            iniciarCapturaFramesPeriodica();
            if (typeof showToast === 'function') {
                showToast('👁️ Cámara activa: Osito puede ver lo que le muestres');
            }
        } catch (err) {
            // Si el usuario rechaza el permiso:
            // NO terminar la llamada. NO cerrar Gemini Live. NO apagar el micrófono.
            console.warn('[CallCamera] Permiso de cámara no autorizado o cancelado:', err);
            isCameraActive = false;
            if (typeof showToast === 'function') {
                showToast('Cámara no autorizada. La conversación por voz continúa normalmente.');
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
                // Detener todas las pistas de vídeo
                cameraStream.getTracks().forEach(function (track) {
                    track.stop();
                });
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
        }
        if (camLabel) {
            camLabel.textContent = 'Cámara';
        }

        if (typeof showToast === 'function') {
            showToast('Cámara apagada. La llamada de voz sigue activa.');
        }
    }

    function capturarFrameActual() {
        if (!isCameraActive || !camVideo || camVideo.readyState < 2) {
            return latestFrameBase64;
        }
        try {
            var c = document.createElement('canvas');
            var vw = camVideo.videoWidth || 640;
            var vh = camVideo.videoHeight || 480;
            c.width = 480;
            c.height = Math.round((480 * vh) / vw);
            var ctx = c.getContext('2d');
            ctx.drawImage(camVideo, 0, 0, c.width, c.height);
            var dataUrl = c.toDataURL('image/jpeg', 0.80);
            latestFrameBase64 = dataUrl;
            return dataUrl;
        } catch (e) {
            return latestFrameBase64;
        }
    }

    function iniciarCapturaFramesPeriodica() {
        if (frameCaptureTimer) clearInterval(frameCaptureTimer);
        frameCaptureTimer = setInterval(function () {
            if (isCameraActive) {
                capturarFrameActual();
            }
        }, 2600);
    }

    // ========================================================================
    // 9. TRANSCRIPCIÓN Y VISUALIZACIÓN DE RESPUESTAS ESCRITAS PROGRESIVAS
    // ========================================================================
    function mostrarTranscripcionUsuario(texto) {
        if (!texto) return;
        if (transcriptUserEl) transcriptUserEl.textContent = texto;
        if (transcriptUserBox) transcriptUserBox.hidden = false;
    }

    function mostrarRespuestaTexto(texto) {
        if (!texto) return;
        if (responseTextEl) responseTextEl.textContent = texto;
        if (responseBox) responseBox.scrollTop = responseBox.scrollHeight;
    }

    function mostrarRespuestaTextoProgresiva(textoCompleto, callback) {
        if (!responseTextEl) {
            if (callback) callback();
            return;
        }
        if (textStreamTimer) {
            clearInterval(textStreamTimer);
            textStreamTimer = null;
        }

        var palabras = String(textoCompleto || '').split(' ');
        var actual = '';
        var idx = 0;

        textStreamTimer = setInterval(function () {
            if (idx < palabras.length) {
                actual += (idx === 0 ? '' : ' ') + palabras[idx];
                responseTextEl.textContent = actual;
                if (responseBox) responseBox.scrollTop = responseBox.scrollHeight;
                idx++;
            } else {
                clearInterval(textStreamTimer);
                textStreamTimer = null;
                if (callback) callback();
            }
        }, 80);
    }

    // ========================================================================
    // 10. CONVERSACIÓN EN TIEMPO REAL CON GEMINI LIVE
    // ========================================================================
    function obtenerApiKeyGemini() {
        var key = '';
        if (window.AndroidBridge && typeof window.AndroidBridge.getGeminiApiKey === 'function') {
            try { key = window.AndroidBridge.getGeminiApiKey(); } catch (_) {}
        }
        if (!key && window.GEMINI_API_KEY) key = window.GEMINI_API_KEY;
        if (!key) key = localStorage.getItem('GEMINI_API_KEY') || '';
        return String(key).trim();
    }

    async function llamarGeminiLiveRest(pregunta, frameBase64) {
        var apiKey = obtenerApiKeyGemini();
        if (!apiKey) return null; // Fallback al servidor /api/ia o local

        var url = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=' + apiKey;

        var parts = [{ text: pregunta }];

        if (frameBase64 && frameBase64.startsWith('data:image/')) {
            var rawData = frameBase64.replace(/^data:image\/[a-z]+;base64,/, '');
            parts.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: rawData
                }
            });
        }

        var systemPrompt = 'Eres "La mascotita del Sótano", la inteligencia artificial oficial de "El Sótano de Osito" (canal OsitoGamer360YT). ' +
            'Estás en una llamada de voz en tiempo real con el usuario. ' +
            'Habla de manera alegre, cercana, inteligente y expresiva. ' +
            'Tus respuestas deben ser naturales, fluidas y concisas (1 a 3 oraciones claras). ' +
            'Si la cámara está activa y hay una imagen, analiza con atención lo que el usuario te muestra frente a la cámara (objetos, mascotas, ropa, gestos). ' +
            'Identifícalos con total certeza. Si no estás seguro de algo, dilo honestamente sin inventar.';

        var requestBody = {
            contents: [{ parts: parts }],
            generationConfig: {
                temperature: 0.7,
                maxOutputTokens: 300
            },
            systemInstruction: {
                parts: [{ text: systemPrompt }]
            }
        };

        var res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestBody)
        });

        if (!res.ok) throw new Error('Error en Gemini API status ' + res.status);
        var data = await res.json();
        var replyText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return replyText ? String(replyText).trim() : null;
    }

    async function procesarEntradaUsuario(preguntaUsuario) {
        var limpia = String(preguntaUsuario || '').trim();
        if (!limpia) return;

        mostrarTranscripcionUsuario(limpia);
        setCallAvatarState('THINKING');

        // Capturar frame de la cámara si está activa
        var fotoAEnviar = isCameraActive ? capturarFrameActual() : null;

        try {
            var respuesta = null;

            // 1. Intentar llamada directa a Gemini Live REST si hay clave disponible
            try {
                respuesta = await llamarGeminiLiveRest(limpia, fotoAEnviar);
            } catch (errGemini) {
                console.warn('[CallModeEngine] Error llamando a Gemini REST directo:', errGemini);
            }

            // 2. Intentar llamar mediante /api/ia (servidor existente)
            if (!respuesta && window.OsitoIA && typeof window.OsitoIA.preguntar === 'function') {
                try {
                    var resIA = await window.OsitoIA.preguntar(limpia, {
                        imagen: fotoAEnviar,
                        nombre: localStorage.getItem('osito_ai_nombre') || '',
                        genero: localStorage.getItem('osito_ai_genero') || 'male'
                    });
                    if (resIA && resIA.texto) {
                        respuesta = resIA.texto;
                    }
                } catch (_) {}
            }

            // 3. Base de conocimiento local / respuesta contextual
            if (!respuesta && window.OsitoConocimiento && typeof window.OsitoConocimiento.buscarEnBaseConocimiento === 'function') {
                respuesta = window.OsitoConocimiento.buscarEnBaseConocimiento(limpia);
            }

            // 4. Si la cámara está activa y el usuario preguntó qué ve
            if (!respuesta && isCameraActive && /(que ves|mira esto|ves|que tengo|como me veo)/i.test(limpia)) {
                respuesta = '¡Te veo clarito por tu cámara! Enfoca bien lo que me quieres mostrar frente a la lente.';
            }

            if (!respuesta) {
                respuesta = '¡Te escucho clarito! Cuéntame más o muéstrame algo con tu cámara.';
            }

            // Reacción emocional automática del avatar al texto de respuesta
            determinarEmocionPorTexto(respuesta);

            // Mostrar texto progresivamente Y hablar la respuesta con Lip-Sync real
            mostrarRespuestaTextoProgresiva(respuesta);
            hablarRespuesta(respuesta);

        } catch (err) {
            console.error('[CallModeEngine] Error procesando turno de llamada:', err);
            setCallAvatarState('IDLE');
        }
    }

    function determinarEmocionPorTexto(texto) {
        var t = String(texto || '').toLowerCase();
        if (/jaja|jeje|chiste|divertido|risa/.test(t)) {
            setCallAvatarState('LAUGHING');
        } else if (/genial|increible|fiesta|que bien|felicidades/.test(t)) {
            setCallAvatarState('EXCITED');
        } else if (/mira|woow|vaya|sorprendente|increible/.test(t)) {
            setCallAvatarState('SURPRISED');
        } else if (/triste|pena|animo|lo siento/.test(t)) {
            setCallAvatarState('SAD');
        } else if (/no se|no estoy seguro|duda|curioso|quizas/.test(t)) {
            setCallAvatarState('CONFUSED');
        } else {
            setCallAvatarState('SPEAKING');
        }
    }

    function hablarRespuesta(texto) {
        asegurarAudioContext();
        setCallAvatarState('SPEAKING');

        if (typeof window.hablarIA === 'function') {
            window.hablarIA(texto);
        } else if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
            var utt = new SpeechSynthesisUtterance(texto);
            utt.lang = 'es-MX';
            utt.rate = 1.02;
            utt.pitch = 1.05;

            utt.onstart = function () {
                if (isCallActive) setCallAvatarState('SPEAKING');
            };

            utt.onend = function () {
                if (isCallActive) {
                    setCallAvatarState(isMicMuted ? 'IDLE' : 'LISTENING');
                    if (!isMicMuted && window.voiceAssistant && typeof window.voiceAssistant.startListening === 'function') {
                        window.voiceAssistant.startListening(true);
                    }
                }
            };

            utt.onerror = function () {
                if (isCallActive) setCallAvatarState(isMicMuted ? 'IDLE' : 'LISTENING');
            };

            window.speechSynthesis.speak(utt);
        }
    }

    // ========================================================================
    // 11. CICLO DE VIDA: INICIAR Y FINALIZAR LLAMADA
    // ========================================================================
    function iniciarLlamada() {
        isCallActive = true;
        inicializarElementos();
        asegurarAudioContext();

        // Ocultar cualquier cubo que pudiera existir en la cabecera del modo llamada
        var callView = document.getElementById('ia-call-view');
        if (callView) {
            var cubosViejos = callView.querySelectorAll('.osito-face, .ia-call-mascot-face');
            cubosViejos.forEach(function (c) {
                c.style.setProperty('display', 'none', 'important');
            });
        }

        // Restablecer estados
        isMicMuted = false;
        setMute(false);
        setCallAvatarState('SPEAKING');
        iniciarAnimacionesIdle();

        // Saludo inicial de bienvenida
        var saludo = '¡Hola! Ya estamos en modo llamada con voz en vivo. Puedes platicar conmigo o activar la cámara con el botón 📷.';
        mostrarRespuestaTexto(saludo);
    }

    function finalizarLlamada() {
        isCallActive = false;
        detenerAnimacionesIdle();
        detenerLipSync();
        desactivarCamara();

        isSpeakingAudio = false;
        isMicMuted = false;

        if (textStreamTimer) {
            clearInterval(textStreamTimer);
            textStreamTimer = null;
        }

        // Detener síntesis de voz en llamada
        if ('speechSynthesis' in window) {
            window.speechSynthesis.cancel();
        }

        // Detener asistente de voz si estaba escuchando
        if (window.voiceAssistant && typeof window.voiceAssistant.stopListening === 'function') {
            window.voiceAssistant.stopListening();
        }

        // Restablecer estados del Avatar 2D Circular
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

        // Restablecer el badge
        if (stateBadgeEl) {
            stateBadgeEl.textContent = '✨ Conectando con La mascotita del Sótano...';
        }
    }

    // ========================================================================
    // 12. ESCUCHADORES DE EVENTOS GLOBALES DE VOZ
    // ========================================================================
    document.addEventListener('osito:tts-start', function () {
        if (!isCallActive && !window.ositoEnLlamadaIA) return;
        setCallAvatarState('SPEAKING');
    });

    document.addEventListener('osito:tts-end', function () {
        if (!isCallActive && !window.ositoEnLlamadaIA) return;
        if (!isMicMuted) {
            setCallAvatarState('LISTENING');
            setTimeout(function () {
                if (isCallActive && !isMicMuted && window.voiceAssistant && typeof window.voiceAssistant.startListening === 'function') {
                    window.voiceAssistant.startListening(true);
                }
            }, 250);
        } else {
            setCallAvatarState('IDLE');
        }
    });

    document.addEventListener('voiceassistant:state', function (e) {
        if (!isCallActive && !window.ositoEnLlamadaIA) return;
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

    document.addEventListener('voiceassistant:transcript', function (e) {
        if (!isCallActive && !window.ositoEnLlamadaIA) return;
        var txt = e && e.detail && e.detail.text;
        if (txt) {
            mostrarTranscripcionUsuario(txt);
        }
    });

    // Auto-inicializar cuando el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', inicializarElementos);
    } else {
        inicializarElementos();
    }

    // Exportar API exclusiva de llamada
    global.CallModeEngine = {
        iniciarLlamada: iniciarLlamada,
        finalizarLlamada: finalizarLlamada,
        setCallAvatarState: setCallAvatarState,
        playCallExpressionSound: playCallExpressionSound,
        setMute: setMute,
        toggleMute: toggleMute,
        toggleCamara: toggleCamara,
        activarCamara: activarCamaraReal,
        desactivarCamara: desactivarCamara,
        capturarFrame: capturarFrameActual,
        mostrarRespuestaTexto: mostrarRespuestaTexto,
        mostrarTranscripcionUsuario: mostrarTranscripcionUsuario,
        procesarEntradaUsuario: procesarEntradaUsuario,
        hablarRespuesta: hablarRespuesta,
        isMuted: function () { return isMicMuted; },
        isCameraActive: function () { return isCameraActive; },
        isCallActive: function () { return isCallActive; }
    };

})(window);
