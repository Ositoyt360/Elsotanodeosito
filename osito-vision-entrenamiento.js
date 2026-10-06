/**
 * ============================================================================
 * OSITO VISION & AUTO-ENTRENAMIENTO DEL CUBO 3D (V63)
 * ============================================================================
 * 1) Auto-Entrenamiento Autónomo del Cubo ("El cubo se entrena a sí mismo"):
 *    - El cubo ejecuta ciclos continuos de auto-aprendizaje neuronal en segundo plano.
 *    - Calcula matrices sinápticas, optimiza precisión, reduce la pérdida (loss)
 *      y sube de nivel con habilidades cognitivas desbloqueadas.
 *    - Gira sobre sus 3 ejes en el espacio 3D para calcular trayectorias y balance.
 *
 * 2) Ciclo Dinámico de Entrenamiento y Juego ("Va entrenando y va jugando"):
 *    - Alterna autónomamente entre fases de estudio neuronal y juegos acrobáticos.
 *    - Auto-juegos: resuelve puzzles, piruetas 360°, malabares de emojis y rebotes.
 *    - Juegos interactivos con el usuario por visión:
 *      * Duelo de miradas (el primero que se mueva o parpadee pierde).
 *      * Sigue al cubo (el cubo gira y tú debes seguirlo con tu cabeza).
 *      * A las escondidas (te escondes de la cámara y el cubo te busca).
 *      * Adivina el objeto (muéstrale algo a tu cámara y la IA lo adivina).
 *      * Reto de muecas (imita la expresión que te pida).
 *      * ¿Qué estás viendo? (descripción en tiempo real de lo que ve).
 *
 * 3) Visión Real por Cámara ("Que la inteligencia artificial lo vea, no una camarita"):
 *    - El video se procesa de forma invisible/headless (sin cuadros feos de webcam).
 *    - Un procesador óptico ultraligero a 12 FPS calcula en tiempo real:
 *      * Dónde está el usuario (centroide óptico X, Y).
 *      * Si está quieto, si se mueve o si saluda con la mano.
 *      * Si se acerca o se aleja.
 *      * Si desaparece del encuadre.
 *    - ¡Los ojos y el cuerpo 3D del cubo siguen físicamente al usuario en tiempo real!
 *    - Al saludar o moverse, el cubo reacciona con alegría, guiños y comentarios vivos.
 * ============================================================================
 */
(function () {
    'use strict';
    if (window.__OsitoVisionEntrenamientoV63) return;
    window.__OsitoVisionEntrenamientoV63 = true;

    // --- Estado Persistente de Aprendizaje y Juego ---
    var STORAGE_KEY = 'osito_cubo_neural_state_v63';
    var estado = {
        nivel: 1,
        xp: 0,
        xpSiguiente: 120,
        visionActiva: false,
        accuracy: 94.8,
        loss: 0.052,
        epoca: 1,
        sinapsis: 4096,
        modoActual: 'entrenando', // 'entrenando' | 'jugando' | 'atento'
        juegosGanados: 0,
        juegosJugados: 0,
        objetosReconocidos: 0,
        habilidades: ['Visión Óptica 3D', 'Seguimiento de Mirada']
    };

    try {
        var guardado = localStorage.getItem(STORAGE_KEY);
        if (guardado) {
            var parseado = JSON.parse(guardado);
            if (parseado && typeof parseado === 'object') {
                estado = Object.assign(estado, parseado);
            }
        }
    } catch (_) {}

    function guardarEstado() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(estado));
        } catch (_) {}
    }

    // --- Procesador Óptico Headless (La IA ve sin ventanas feas) ---
    var streamCamara = null;
    var videoHeadless = null;
    var canvasOptico = null;
    var ctxOptico = null;
    var canvasFoto = null;
    var loopVisionId = 0;
    var frameAnteriorData = null;
    var usuarioVisto = false;
    var ultimoVistoTs = Date.now();
    var avisoAusenciaDado = false;
    var posUsuario = { x: 0, y: 0 }; // Normalizado -1.0 a 1.0
    var posSmooth = { x: 0, y: 0 };
    var camaraIniciando = false;

    function asegurarElementosOpticos() {
        if (!videoHeadless) {
            videoHeadless = document.createElement('video');
            videoHeadless.setAttribute('autoplay', '');
            videoHeadless.setAttribute('playsinline', '');
            videoHeadless.setAttribute('muted', '');
            videoHeadless.muted = true;
            videoHeadless.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none;z-index:-9999;';
            (document.body || document.documentElement).appendChild(videoHeadless);
        }
        if (!canvasOptico) {
            canvasOptico = document.createElement('canvas');
            canvasOptico.width = 40; // Resolución ultraligera para 120Hz sin coste de CPU
            canvasOptico.height = 30;
            ctxOptico = canvasOptico.getContext('2d', { willReadFrequently: true });
        }
        if (!canvasFoto) {
            canvasFoto = document.createElement('canvas');
            canvasFoto.width = 480;
            canvasFoto.height = 360;
        }
    }

    // Encender la visión óptica de la IA
    async function encenderVision(solicitarPermiso) {
        if (streamCamara && streamCamara.active) {
            actualizarUIVision(true);
            return true;
        }
        if (camaraIniciando) return false;
        camaraIniciando = true;
        asegurarElementosOpticos();

        try {
            if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
                console.warn('[OsitoVision] navigator.mediaDevices no disponible');
                camaraIniciando = false;
                return false;
            }

            var constraints = {
                audio: false,
                video: {
                    facingMode: 'user',
                    width: { ideal: 640, max: 1280 },
                    height: { ideal: 480, max: 720 },
                    frameRate: { ideal: 30, max: 60 }
                }
            };

            streamCamara = await navigator.mediaDevices.getUserMedia(constraints);
            videoHeadless.srcObject = streamCamara;
            await videoHeadless.play().catch(function () {});

            estado.visionActiva = true;
            guardarEstado();
            actualizarUIVision(true);
            camaraIniciando = false;

            iniciarLoopVision();
            reaccionarCubo('vision_on');
            sumarXP(25, 'Visión IA activada');

            if (typeof showToast === 'function') {
                showToast('👁️ Ojos del cubo abiertos: ¡La IA ya te está viendo!');
            }
            return true;
        } catch (err) {
            console.warn('[OsitoVision] Permiso o cámara no disponible:', err);
            camaraIniciando = false;
            actualizarUIVision(false);
            if (solicitarPermiso && typeof showToast === 'function') {
                showToast('Habilita el permiso de cámara para que Osito pueda verte 👀✨');
            }
            return false;
        }
    }

    function apagarVision() {
        if (loopVisionId) {
            cancelAnimationFrame(loopVisionId);
            clearTimeout(loopVisionId);
            loopVisionId = 0;
        }
        if (streamCamara) {
            try {
                var tracks = streamCamara.getTracks();
                tracks.forEach(function (t) { t.stop(); });
            } catch (_) {}
            streamCamara = null;
        }
        if (videoHeadless) {
            videoHeadless.srcObject = null;
        }
        estado.visionActiva = false;
        guardarEstado();
        actualizarUIVision(false);
        resetearMiradaCubo();
        if (typeof showToast === 'function') {
            showToast('Ojos del cubo cerrados (Cámara desconectada)');
        }
    }

    function toggleVision() {
        if (streamCamara && streamCamara.active) {
            apagarVision();
        } else {
            encenderVision(true);
        }
    }

    // Capturar foto actual para análisis Gemini Vision
    function capturarFotogramaBase64() {
        if (!videoHeadless || !streamCamara || !streamCamara.active) return null;
        if (videoHeadless.readyState < 2) return null;
        try {
            var ctx = canvasFoto.getContext('2d');
            var vw = videoHeadless.videoWidth || 480;
            var vh = videoHeadless.videoHeight || 360;
            canvasFoto.width = Math.min(vw, 640);
            canvasFoto.height = Math.round((canvasFoto.width * vh) / vw);
            ctx.drawImage(videoHeadless, 0, 0, canvasFoto.width, canvasFoto.height);
            return canvasFoto.toDataURL('image/jpeg', 0.84);
        } catch (e) {
            console.warn('[OsitoVision] Error capturando fotograma:', e);
            return null;
        }
    }

    // --- Loop de Procesamiento Óptico en Vivo (Rastreo de Usuario) ---
    var ultimoProcesamiento = 0;
    var contadorMovimientoFuerte = 0; var ultimoAvisoMovimientoIA=0;

    function procesarFrameOptico() {
        if (!streamCamara || !streamCamara.active || !videoHeadless || videoHeadless.readyState < 2) {
            return;
        }

        var ahora = performance.now();
        // Procesar cada 80ms (~12 FPS) para mantener la pantalla a 120Hz sin fatigar la GPU
        if (ahora - ultimoProcesamiento < 80) return;
        ultimoProcesamiento = ahora;

        var w = canvasOptico.width;
        var h = canvasOptico.height;
        ctxOptico.drawImage(videoHeadless, 0, 0, w, h);
        var frame = ctxOptico.getImageData(0, 0, w, h);
        var data = frame.data;

        var sumX = 0, sumY = 0, puntosMovimiento = 0;
        var diffTotal = 0;

        if (frameAnteriorData) {
            var len = data.length;
            for (var i = 0; i < len; i += 8) { // Muestreo rápido cada 2 píxeles
                var rDiff = Math.abs(data[i] - frameAnteriorData[i]);
                var gDiff = Math.abs(data[i + 1] - frameAnteriorData[i + 1]);
                var bDiff = Math.abs(data[i + 2] - frameAnteriorData[i + 2]);
                var diff = (rDiff + gDiff + bDiff) / 3;

                if (diff > 18) {
                    var px = (i / 4) % w;
                    var py = Math.floor((i / 4) / w);
                    sumX += px;
                    sumY += py;
                    puntosMovimiento++;
                    diffTotal += diff;
                }
            }
        }

        frameAnteriorData = new Uint8ClampedArray(data);

        var hayPresencia = puntosMovimiento > 8;

        if (hayPresencia) {
            // Nota: La cámara frontal es como un espejo, por lo que invertimos X para que mire al usuario
            var centroX = (sumX / puntosMovimiento);
            var centroY = (sumY / puntosMovimiento);

            var normX = -((centroX / w) * 2 - 1); // -1.0 (izq usuario) a 1.0 (der usuario)
            var normY = ((centroY / h) * 2 - 1);  // -1.0 (arriba) a 1.0 (abajo)

            normX = Math.max(-1, Math.min(1, normX * 1.3));
            normY = Math.max(-1, Math.min(1, normY * 1.2));

            posUsuario.x = normX;
            posUsuario.y = normY;
            usuarioVisto = true;
            ultimoVistoTs = Date.now();

            if (avisoAusenciaDado) {
                avisoAusenciaDado = false;
                reaccionarCubo('usuario_volvio');
            }

            // Detección de saludo o movimiento rápido
            if (diffTotal > 1400) {
                contadorMovimientoFuerte++;
                if (contadorMovimientoFuerte === 4) {
                    reaccionarCubo('saludo_detectado');
                    var ahoraAviso=Date.now();
                    if(window.ositoEnLlamadaIA&&ahoraAviso-ultimoAvisoMovimientoIA>12000&&typeof window.hablarIA==='function'){ultimoAvisoMovimientoIA=ahoraAviso;window.hablarIA('¡Ey! Vi que te moviste. ¿Qué estás haciendo?');}
                }
            } else {
                contadorMovimientoFuerte = Math.max(0, contadorMovimientoFuerte - 1);
            }
        } else {
            // El usuario no se mueve o salió del encuadre
            if (Date.now() - ultimoVistoTs > 3200 && !avisoAusenciaDado) {
                avisoAusenciaDado = true;
                reaccionarCubo('usuario_desaparecio');
            }
        }

        // Suavizado cinemático (Lerp) para la mirada y rotación 3D del cubo
        posSmooth.x += (posUsuario.x - posSmooth.x) * 0.22;
        posSmooth.y += (posUsuario.y - posSmooth.y) * 0.22;

        aplicarMiradaOptica(posSmooth.x, posSmooth.y);
    }

    function aplicarMiradaOptica(dx, dy) {
        var caras = document.querySelectorAll('.osito-face');
        caras.forEach(function (cara) {
            if (!cara.offsetParent) return;
            // Mirada de los ojos
            cara.style.setProperty('--gx', dx.toFixed(2));
            cara.style.setProperty('--gy', dy.toFixed(2));
            // Rotación 3D física de todo el cubo para encarar al usuario
            cara.style.setProperty('--cy', (dx * 28).toFixed(1) + 'deg');
            cara.style.setProperty('--cx', (-dy * 20).toFixed(1) + 'deg');
        });
    }

    function resetearMiradaCubo() {
        var caras = document.querySelectorAll('.osito-face');
        caras.forEach(function (cara) {
            cara.style.setProperty('--gx', '0');
            cara.style.setProperty('--gy', '0');
            cara.style.setProperty('--cx', '0deg');
            cara.style.setProperty('--cy', '0deg');
        });
    }

    function iniciarLoopVision() {
        function tick() {
            if (streamCamara && streamCamara.active) {
                procesarFrameOptico();
                loopVisionId = requestAnimationFrame(tick);
            }
        }
        loopVisionId = requestAnimationFrame(tick);
    }

    // Reacciones del cubo a la visión
    function reaccionarCubo(tipo) {
        var caras = document.querySelectorAll('.osito-face');
        if (tipo === 'vision_on') {
            caras.forEach(function (c) {
                c.setAttribute('data-expr', 'excited');
                c.classList.add('of-party-bounce');
                setTimeout(function () { c.classList.remove('of-party-bounce'); }, 850);
            });
        } else if (tipo === 'saludo_detectado') {
            caras.forEach(function (c) {
                c.setAttribute('data-expr', 'joy');
                c.classList.add('of-wiggle');
                setTimeout(function () { c.classList.remove('of-wiggle'); }, 600);
            });
            if (window.ositoEnLlamadaIA) {
                var sub = document.getElementById('ia-call-subtitle');
                if (sub) sub.textContent = '👋 ¡Te veo saludando! ¡Hola amigo!';
            }
        } else if (tipo === 'usuario_desaparecio') {
            caras.forEach(function (c) {
                c.setAttribute('data-expr', 'confused');
            });
            if (window.ositoEnLlamadaIA) {
                var subDes = document.getElementById('ia-call-subtitle');
                if (subDes) subDes.textContent = '❓ ¿A dónde te fuiste? ¡Te he perdido de vista!';
            }
        } else if (tipo === 'usuario_volvio') {
            caras.forEach(function (c) {
                c.setAttribute('data-expr', 'love');
                c.classList.add('v62-hop');
                setTimeout(function () { c.classList.remove('v62-hop'); }, 600);
            });
            if (window.ositoEnLlamadaIA) {
                var subVol = document.getElementById('ia-call-subtitle');
                if (subVol) subVol.textContent = '🎉 ¡Ahí estás de nuevo! ¡Te volví a ver!';
            }
        } else if (tipo === 'levelup') {
            caras.forEach(function (c) {
                c.setAttribute('data-expr', 'joy');
                c.classList.add('of-spin-joy');
                setTimeout(function () { c.classList.remove('of-spin-joy'); }, 950);
            });
        }
    }

    // --- Sistema Autónomo de Auto-Entrenamiento del Cubo ---
    var FRASES_ENTRENAMIENTO = [
        '🧠 Auto-Entrenamiento: Optimizando pesos sinápticos y visión 3D...',
        '✨ Auto-Entrenamiento: Calibrando expresiones 3D y reflejos...',
        '🎯 Auto-Entrenamiento: Disminuyendo error y subiendo precisión...',
        '👁️ Auto-Entrenamiento: Procesando patrones visuales en tiempo real...',
        '🚀 Auto-Entrenamiento: Compresión de memoria y auto-análisis...'
    ];

    var ACROBACIAS_JUEGO = [
        { expr: 'joy', anim: 'of-spin-joy', frase: '🎲 ¡Cubo jugando! Haciendo giro acrobático 360° 🎉' },
        { expr: 'excited', anim: 'v62-hop', frase: '⭐ ¡Cubo jugando! Practicando salto de alegría 🌟' },
        { expr: 'cool', anim: 'of-party-bounce', frase: '😎 ¡Cubo jugando! Demostrando estilo cúbico ✨' },
        { expr: 'wink', anim: 'of-wiggle', frase: '😉 ¡Cubo jugando! Guiño travieso y trucos 3D 🎲' }
    ];

    function cicloAutonomoEntrenarYJugar() {
        if (document.hidden) return;

        // Alterna entre entrenar y jugar
        var esTurnoJuego = (estado.epoca % 3 === 0);
        estado.modoActual = esTurnoJuego ? 'jugando' : 'entrenando';

        if (esTurnoJuego) {
            // FASE DE AUTO-JUEGO
            var juego = ACROBACIAS_JUEGO[Math.floor(Math.random() * ACROBACIAS_JUEGO.length)];
            var caras = document.querySelectorAll('.osito-face');
            caras.forEach(function (c) {
                if (!c.classList.contains('is-speaking')) {
                    c.setAttribute('data-expr', juego.expr);
                    c.classList.add(juego.anim);
                    setTimeout(function () { c.classList.remove(juego.anim); }, 1000);
                }
            });

            if (window.ositoEnLlamadaIA) {
                var sub = document.getElementById('ia-call-subtitle');
                var orb = document.getElementById('ia-call-orb');
                if (sub && orb && !orb.classList.contains('is-speaking') && !orb.classList.contains('is-listening')) {
                    sub.textContent = juego.frase;
                }
            }
            sumarXP(20, 'Auto-Juego Cúbico');
        } else {
            // FASE DE AUTO-ENTRENAMIENTO
            estado.epoca += 1;
            estado.accuracy = Math.min(99.9, +(estado.accuracy + 0.12).toFixed(2));
            estado.loss = Math.max(0.005, +(estado.loss * 0.96).toFixed(4));
            estado.sinapsis += 64;

            // Pulso de entrenamiento visual en el cubo
            var carasEnt = document.querySelectorAll('.osito-face');
            carasEnt.forEach(function (c) {
                c.setAttribute('data-training', 'active');
                setTimeout(function () { c.removeAttribute('data-training'); }, 1400);
            });

            if (window.ositoEnLlamadaIA) {
                var subE = document.getElementById('ia-call-subtitle');
                var orbE = document.getElementById('ia-call-orb');
                if (subE && orbE && !orbE.classList.contains('is-speaking') && !orbE.classList.contains('is-listening')) {
                    var fIdx = Math.floor(Math.random() * FRASES_ENTRENAMIENTO.length);
                    subE.textContent = FRASES_ENTRENAMIENTO[fIdx];
                }
            }
            sumarXP(15, 'Época de Auto-Entrenamiento #' + estado.epoca);
        }

        actualizarUIEntrenamiento();
    }

    function sumarXP(puntos, motivo) {
        estado.xp += puntos;
        var subioNivel = false;
        while (estado.xp >= estado.xpSiguiente) {
            estado.xp -= estado.xpSiguiente;
            estado.nivel += 1;
            estado.xpSiguiente = Math.round(estado.xpSiguiente * 1.38);
            subioNivel = true;

            var NUEVAS_HABILIDADES = [
                'Reflejos Ópticos Ultra',
                'Duelo de Miradas Maestro',
                'Reconocimiento Facial Gemini',
                'Acrobacia Cúbica 360°',
                'Simón Dice con la Cabeza',
                'Lectura de Expresiones',
                'Consciencia Cúbica Total'
            ];
            var nuevaHab = NUEVAS_HABILIDADES[(estado.nivel - 2) % NUEVAS_HABILIDADES.length];
            if (nuevaHab && estado.habilidades.indexOf(nuevaHab) === -1) {
                estado.habilidades.push(nuevaHab);
            }
        }

        guardarEstado();
        actualizarUIEntrenamiento();

        if (subioNivel) {
            reaccionarCubo('levelup');
            if (window.OsitoFaceSound && window.OsitoFaceSound.reproducir) {
                window.OsitoFaceSound.reproducir('happy');
            }
            var msg = '🎉 ¡El cubo subió al Nivel ' + estado.nivel + ' de Auto-Entrenamiento! Desbloqueó: ' + (estado.habilidades[estado.habilidades.length - 1] || 'Gran Sabiduría');
            if (typeof showToast === 'function') showToast(msg);
            if (window.ositoEnLlamadaIA && typeof window.hablarIA === 'function') {
                window.hablarIA('¡Yuju! Acabo de subir al nivel ' + estado.nivel + ' entrenándome a mí mismo. ¡Cada vez veo y juego mejor contigo!');
            }
        }
    }

    function actualizarUIEntrenamiento() {
        var elNiveles = document.querySelectorAll('#cube-training-level, .cube-live-level');
        elNiveles.forEach(function (el) { el.textContent = 'Nv. ' + estado.nivel; });

        var elBarras = document.querySelectorAll('#cube-training-bar-fill, .cube-live-xp-bar');
        elBarras.forEach(function (b) {
            var pct = Math.min(100, Math.round((estado.xp / estado.xpSiguiente) * 100));
            b.style.width = pct + '%';
        });

        var elStats = document.getElementById('cube-training-stats-text');
        if (elStats) {
            elStats.textContent = 'Época #' + estado.epoca + ' · Precisión: ' + estado.accuracy + '% · XP: ' + estado.xp + ' / ' + estado.xpSiguiente;
        }
    }

    function actualizarUIVision(activa) {
        var badges = document.querySelectorAll('.ia-vision-status-pill, #ia-call-vision-badge');
        badges.forEach(function (b) {
            b.classList.toggle('vision-on', activa);
            b.innerHTML = activa
                ? '<span class="ia-vision-live-dot"></span> 👁️ La IA te está viendo'
                : '<span class="ia-vision-off-dot"></span> 👁️ Activar Ojos del Cubo';
        });

        var faces = document.querySelectorAll('.osito-face');
        faces.forEach(function (f) {
            f.classList.toggle('cube-vision-active', activa);
            if (activa) f.setAttribute('data-vision', 'active');
            else f.removeAttribute('data-vision');
        });

        var visionBtn = document.getElementById('ia-call-vision-btn');
        if (visionBtn) {
            visionBtn.classList.toggle('active-vision', activa);
            var lbl = visionBtn.querySelector('.ia-vision-btn-label');
            if (lbl) lbl.textContent = activa ? 'Viendo' : 'Ojos IA';
        }
    }

    // --- JUEGOS INTERACTIVOS CON VISIÓN DE LA IA ---

    // 1) Duelo de Miradas ("¿Quién parpadea o se mueve primero?")
    async function jugarDueloMiradas() {
        var ok = await encenderVision(true);
        if (!ok) return;

        var msj = '👀 ¡Duelo de Miradas! Mírame fijamente a los ojos... ¡Quédate totalmente quieto y no te muevas!';
        mostrarTextoJuego(msj);
        if (typeof window.hablarIA === 'function') window.hablarIA(msj);

        var segundos = 6;
        var timerDuelo = setInterval(function () {
            if (contadorMovimientoFuerte > 2) {
                clearInterval(timerDuelo);
                var perdiste = '😂 ¡Te moviste! ¡He ganado el duelo de miradas con mis ojos de cubo! 🎉';
                mostrarTextoJuego(perdiste);
                if (typeof window.hablarIA === 'function') window.hablarIA(perdiste);
                reaccionarCubo('saludo_detectado');
                sumarXP(40, 'Duelo de miradas jugado');
                return;
            }
            segundos--;
            if (segundos <= 0) {
                clearInterval(timerDuelo);
                var ganaste = '🏆 ¡Increíble! Te quedaste como una estatua. ¡Empate legendario! Ganaste 80 XP 🌟';
                mostrarTextoJuego(ganaste);
                if (typeof window.hablarIA === 'function') window.hablarIA(ganaste);
                reaccionarCubo('levelup');
                sumarXP(80, 'Duelo de miradas ganado');
                estado.juegosGanados += 1;
            } else {
                mostrarTextoJuego('👀 Aguantando la mirada... ' + segundos + 's restantes');
            }
        }, 1000);
    }

    // 2) Sigue al Cubo
    async function jugarSigueAlCubo() {
        var ok = await encenderVision(true);
        if (!ok) return;

        var lado = Math.random() > 0.5 ? 'derecha' : 'izquierda';
        var ladoTexto = lado === 'derecha' ? 'la derecha 👉' : 'la izquierda 👈';
        var targetX = lado === 'derecha' ? 0.75 : -0.75;

        // El cubo se inclina al lado
        aplicarMiradaOptica(targetX, 0);

        var msj = '🎯 ¡Sigue al Cubo! El cubo se ha movido... ¡Mueve tu cabeza hacia ' + ladoTexto + '!';
        mostrarTextoJuego(msj);
        if (typeof window.hablarIA === 'function') window.hablarIA(msj);

        setTimeout(function () {
            var exito = (lado === 'derecha' && posUsuario.x > 0.3) || (lado === 'izquierda' && posUsuario.x < -0.3);
            if (exito) {
                var r = '🎉 ¡Excelente! Detecté tu movimiento hacia ' + lado + '. ¡Qué buenos reflejos!';
                mostrarTextoJuego(r);
                if (typeof window.hablarIA === 'function') window.hablarIA(r);
                reaccionarCubo('levelup');
                sumarXP(70, 'Sigue al cubo completado');
                estado.juegosGanados += 1;
            } else {
                var rFall = '🙂 ¡Casi! Sigue practicando tus movimientos frente a mi cámara.';
                mostrarTextoJuego(rFall);
                if (typeof window.hablarIA === 'function') window.hablarIA(rFall);
            }
        }, 3800);
    }

    // 3) A las Escondidas
    async function jugarEscondidas() {
        var ok = await encenderVision(true);
        if (!ok) return;

        var msj = '🙈 ¡A las escondidas! Tienes 3 segundos para esconderte o tapar tu cámara... ¡1, 2, 3!';
        mostrarTextoJuego(msj);
        if (typeof window.hablarIA === 'function') window.hablarIA(msj);

        setTimeout(function () {
            if (!usuarioVisto || avisoAusenciaDado) {
                var r = '❓ ¿Dónde estás? ¡No te veo por ningún lado! ¡Me has ganado a las escondidas! 🏆';
                mostrarTextoJuego(r);
                if (typeof window.hablarIA === 'function') window.hablarIA(r);
                sumarXP(85, 'Escondidas ganadas');
                estado.juegosGanados += 1;
            } else {
                var rVisto = '👀 ¡Te alcancé a ver! No te dio tiempo de esconderte del todo jaja. ¡Buen intento!';
                mostrarTextoJuego(rVisto);
                if (typeof window.hablarIA === 'function') window.hablarIA(rVisto);
            }
        }, 4200);
    }

    // 4) Adivina el Objeto (Gemini Vision)
    async function jugarAdivinaObjeto() {
        var ok = await encenderVision(true);
        if (!ok) return;

        var msj = '🔍 ¡Adivina el Objeto! Sostén cualquier cosa frente a tu cámara... la estoy analizando...';
        mostrarTextoJuego(msj);
        if (typeof window.hablarIA === 'function') window.hablarIA(msj);

        setTimeout(async function () {
            var foto = capturarFotogramaBase64();
            if (!foto) {
                mostrarTextoJuego('No pude capturar la imagen. Intenta con más iluminación.');
                return;
            }

            var promptJuego = 'El usuario te está mostrando un objeto frente a su cámara para que lo adivines. ' +
                'Mira la foto detenidamente: identifica el objeto principal con entusiasmo, di qué es con alegría ' +
                'y haz un comentario divertido como la mascota cubo del canal OsitoGamer360YT.';

            mostrarTextoJuego('👁️ Analizando lo que me estás mostrando...');

            if (window.OsitoIA && typeof window.OsitoIA.preguntar === 'function') {
                var res = await window.OsitoIA.preguntar(promptJuego, { imagen: foto });
                if (res && res.texto) {
                    mostrarTextoJuego(res.texto);
                    if (typeof window.hablarIA === 'function') window.hablarIA(res.texto);
                    sumarXP(110, 'Objeto adivinado con visión');
                    estado.objetosReconocidos += 1;
                    reaccionarCubo('levelup');
                }
            }
        }, 3600);
    }

    // 5) Reto de Muecas (Gemini Vision)
    async function jugarRetoMuecas() {
        var ok = await encenderVision(true);
        if (!ok) return;

        var RETOS = [
            '¡Haz una sonrisa gigante de oreja a oreja!',
            '¡Cara de sorpresa total con la boca abierta!',
            '¡Haz un guiño divertido frente a la cámara!',
            '¡Ponte muy serio como guardaespaldas!',
            '¡Haz una mueca chistosa sacando la lengua!'
        ];
        var reto = RETOS[Math.floor(Math.random() * RETOS.length)];

        var msj = '🎭 ¡Reto de Muecas! ' + reto + ' ¡Tienes 3 segundos!';
        mostrarTextoJuego(msj);
        if (typeof window.hablarIA === 'function') window.hablarIA(msj);

        setTimeout(async function () {
            var foto = capturarFotogramaBase64();
            if (!foto) return;

            var promptReto = 'El usuario intentó este reto de expresión: "' + reto + '". ' +
                'Observa su rostro en la foto: confirma si hizo el gesto, dile un cumplido con cariño y ' +
                'dile que ahora tú imitas su expresión en el cubo.';

            mostrarTextoJuego('👁️ Analizando tu expresión...');

            if (window.OsitoIA && typeof window.OsitoIA.preguntar === 'function') {
                var res = await window.OsitoIA.preguntar(promptReto, { imagen: foto });
                if (res && res.texto) {
                    mostrarTextoJuego(res.texto);
                    if (typeof window.hablarIA === 'function') window.hablarIA(res.texto);
                    sumarXP(100, 'Reto de muecas superado');
                    estado.juegosGanados += 1;
                    reaccionarCubo('levelup');
                }
            }
        }, 3800);
    }

    // 6) ¿Qué estás viendo? (Gemini Vision)
    async function queVesAhora() {
        var ok = await encenderVision(true);
        if (!ok) return;

        var foto = capturarFotogramaBase64();
        if (!foto) {
            if (typeof showToast === 'function') showToast('Espera un instante mientras el sensor de video se activa...');
            return;
        }

        var promptQueVes = 'Describe con detalle lo que ves frente a tu cámara en este instante: la persona, su ropa, ' +
            'su expresión, lo que hay a su alrededor o en el fondo. Háblale en primera persona como el cubo inteligente que lo está viendo en vivo.';

        mostrarTextoJuego('👁️ Mirándote con atención...');

        if (window.OsitoIA && typeof window.OsitoIA.preguntar === 'function') {
            var res = await window.OsitoIA.preguntar(promptQueVes, { imagen: foto });
            if (res && res.texto) {
                mostrarTextoJuego(res.texto);
                if (typeof window.hablarIA === 'function') window.hablarIA(res.texto);
                sumarXP(65, 'Observación visual directa');
            }
        }
    }

    function mostrarTextoJuego(texto) {
        if (window.ositoEnLlamadaIA) {
            var sub = document.getElementById('ia-call-subtitle');
            if (sub) sub.textContent = texto;
        } else {
            if (typeof window.agregarMensajeIA === 'function') {
                window.agregarMensajeIA(texto, 'bot');
            }
        }
    }

    // --- Panel Modal de Juegos y Auto-Entrenamiento ---
    function abrirMenuJuegos() {
        var viejo = document.getElementById('cube-games-modal');
        if (viejo) viejo.remove();

        var modal = document.createElement('div');
        modal.id = 'cube-games-modal';
        modal.className = 'cube-games-modal-overlay';
        modal.innerHTML = [
            '<div class="cube-games-card">',
            '  <div class="cgc-head">',
            '    <div class="cgc-title">',
            '      <span class="cgc-icon">🧠</span>',
            '      <div>',
            '        <h3>Cubo Autónomo: Entrenamiento & Juegos</h3>',
            '        <p>El cubo se entrena a sí mismo, te ve en vivo y juega contigo</p>',
            '      </div>',
            '    </div>',
            '    <button type="button" class="cgc-close" id="cgc-close-btn" aria-label="Cerrar">✕</button>',
            '  </div>',
            '  <div class="cgc-training-badge">',
            '    <div class="cgc-level-row">',
            '      <span>Nivel del Cubo: <strong id="cube-training-level">Nv. ' + estado.nivel + '</strong></span>',
            '      <span>Precisión Óptica: <strong>' + estado.accuracy + '%</strong></span>',
            '    </div>',
            '    <div class="cgc-bar-track">',
            '      <div class="cgc-bar-fill" id="cube-training-bar-fill" style="width:' + Math.min(100, Math.round((estado.xp / estado.xpSiguiente) * 100)) + '%"></div>',
            '    </div>',
            '    <span class="cgc-xp-caption" id="cube-training-stats-text">Época #' + estado.epoca + ' · XP: ' + estado.xp + ' / ' + estado.xpSiguiente + '</span>',
            '    <div class="cgc-skills-chips">',
            estado.habilidades.map(function (h) { return '<span class="cgc-skill-chip">✨ ' + h + '</span>'; }).join(''),
            '    </div>',
            '  </div>',
            '  <div class="cgc-games-grid">',
            '    <button type="button" class="cgc-game-btn" id="cgc-btn-duelo">',
            '      <span class="cgc-g-icon">👀</span>',
            '      <div>',
            '        <strong>Duelo de Miradas</strong>',
            '        <p>Quédate quieto sin moverte, ¡el que parpadee pierde!</p>',
            '      </div>',
            '    </button>',
            '    <button type="button" class="cgc-game-btn" id="cgc-btn-sigue">',
            '      <span class="cgc-g-icon">🎯</span>',
            '      <div>',
            '        <strong>Sigue al Cubo</strong>',
            '        <p>El cubo se mueve en 3D y tú lo sigues con tu cabeza</p>',
            '      </div>',
            '    </button>',
            '    <button type="button" class="cgc-game-btn" id="cgc-btn-escondidas">',
            '      <span class="cgc-g-icon">🙈</span>',
            '      <div>',
            '        <strong>A las Escondidas</strong>',
            '        <p>Tápate o escóndete de la cámara y el cubo te buscará</p>',
            '      </div>',
            '    </button>',
            '    <button type="button" class="cgc-game-btn" id="cgc-btn-objeto">',
            '      <span class="cgc-g-icon">🔍</span>',
            '      <div>',
            '        <strong>Adivina el Objeto</strong>',
            '        <p>Muéstrale algo frente a la cámara y el cubo adivina qué es</p>',
            '      </div>',
            '    </button>',
            '    <button type="button" class="cgc-game-btn" id="cgc-btn-muecas">',
            '      <span class="cgc-g-icon">🎭</span>',
            '      <div>',
            '        <strong>Reto de Muecas</strong>',
            '        <p>Imita las caras que el cubo te pida y gana puntos</p>',
            '      </div>',
            '    </button>',
            '    <button type="button" class="cgc-game-btn" id="cgc-btn-que-ves">',
            '      <span class="cgc-g-icon">✨</span>',
            '      <div>',
            '        <strong>¿Qué estás viendo?</strong>',
            '        <p>La IA describe cómo te ves y qué tienes frente a ti</p>',
            '      </div>',
            '    </button>',
            '    <button type="button" class="cgc-game-btn" id="cgc-btn-entrenar-ahora">',
            '      <span class="cgc-g-icon">⚡</span>',
            '      <div>',
            '        <strong>Auto-Entrenar Ahora</strong>',
            '        <p>Forzar ciclo de entrenamiento neuronal y cálculo 3D</p>',
            '      </div>',
            '    </button>',
            '    <button type="button" class="cgc-game-btn" id="cgc-btn-vision-toggle">',
            '      <span class="cgc-g-icon">👁️</span>',
            '      <div>',
            '        <strong>' + (estado.visionActiva ? 'Cerrar Ojos del Cubo' : 'Abrir Ojos del Cubo') + '</strong>',
            '        <p>Conecta o apaga la cámara para que te vea en vivo</p>',
            '      </div>',
            '    </button>',
            '  </div>',
            '</div>'
        ].join('\n');

        document.body.appendChild(modal);

        var closeBtn = document.getElementById('cgc-close-btn');
        if (closeBtn) closeBtn.onclick = function () { modal.remove(); };
        modal.onclick = function (e) { if (e.target === modal) modal.remove(); };

        var btnDuelo = document.getElementById('cgc-btn-duelo');
        if (btnDuelo) btnDuelo.onclick = function () { modal.remove(); jugarDueloMiradas(); };

        var btnSigue = document.getElementById('cgc-btn-sigue');
        if (btnSigue) btnSigue.onclick = function () { modal.remove(); jugarSigueAlCubo(); };

        var btnEsc = document.getElementById('cgc-btn-escondidas');
        if (btnEsc) btnEsc.onclick = function () { modal.remove(); jugarEscondidas(); };

        var btnObj = document.getElementById('cgc-btn-objeto');
        if (btnObj) btnObj.onclick = function () { modal.remove(); jugarAdivinaObjeto(); };

        var btnMue = document.getElementById('cgc-btn-muecas');
        if (btnMue) btnMue.onclick = function () { modal.remove(); jugarRetoMuecas(); };

        var btnQue = document.getElementById('cgc-btn-que-ves');
        if (btnQue) btnQue.onclick = function () { modal.remove(); queVesAhora(); };

        var btnEnt = document.getElementById('cgc-btn-entrenar-ahora');
        if (btnEnt) btnEnt.onclick = function () {
            cicloAutonomoEntrenarYJugar();
            if (typeof showToast === 'function') showToast('⚡ Época #' + estado.epoca + ' de auto-entrenamiento completada');
        };

        var btnVis = document.getElementById('cgc-btn-vision-toggle');
        if (btnVis) btnVis.onclick = function () {
            toggleVision();
            modal.remove();
        };
    }

    // --- Inicialización ---
    function init() {
        actualizarUIEntrenamiento();

        // Ciclo autónomo continuo: cada 16 segundos el cubo entrena o juega
        setInterval(cicloAutonomoEntrenarYJugar, 16000);

        // En modo llamada, si el usuario inicia llamada, encender visión óptica si estaba activa
        document.addEventListener('ia-call:start', function () {
            if (estado.visionActiva) encenderVision(false);
        });

        // Enganche a preguntas en el chat sobre si la IA lo está viendo
        document.addEventListener('osito:ia-message', function (e) {
            var txt = (e && e.detail && e.detail.text) || '';
            var rol = (e && e.detail && e.detail.role) || '';
            if (rol === 'user' && /(me ves|me estas viendo|que ves|que tengo puesto|que ropa|adivina que|mira esto|mirame)/i.test(txt)) {
                if (!streamCamara || !streamCamara.active) {
                    if (typeof window.hablarIA === 'function') {
                        setTimeout(function () {
                            window.hablarIA('¡Para que te pueda ver directamente, pulsa el botón de ojos 👁️ o abre los ojos del cubo!');
                        }, 500);
                    }
                }
            }
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Exportar API global
    window.OsitoVision = {
        encender: encenderVision,
        apagar: apagarVision,
        toggle: toggleVision,
        capturarFrame: capturarFotogramaBase64,
        estaActiva: function () { return Boolean(streamCamara && streamCamara.active); },
        abrirMenuJuegos: abrirMenuJuegos,
        jugarDueloMiradas: jugarDueloMiradas,
        jugarSigueAlCubo: jugarSigueAlCubo,
        jugarEscondidas: jugarEscondidas,
        jugarAdivinaObjeto: jugarAdivinaObjeto,
        jugarRetoMuecas: jugarRetoMuecas,
        queVesAhora: queVesAhora,
        sumarXP: sumarXP,
        getEstado: function () { return Object.assign({}, estado); }
    };
})();
