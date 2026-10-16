/* =====================================================================
 * V99.2 — Lector legal profesional + aceptación obligatoria (Actualización 1.9)
 *  - Pantalla propia (no un cuadrito) para Términos y Política de privacidad.
 *  - Botón "Volver": regresa a la pestaña/pantalla anterior (también el botón atrás del celular).
 *  - Hay que LEER hasta el final antes de poder aceptar.
 *  - Botón de voz: lee SOLO el texto del documento (no títulos, botones ni menús).
 *  - La mascota del cubo aparece en el encabezado.
 *  - Decoración distinta según el modo del sitio (normal, Halloween, Navidad, San Valentín, Cumpleaños).
 *  - Registro: las casillas solo se pueden marcar después de leer el documento.
 *  - Usuarios que ya tenían cuenta: ventana obligatoria al entrar si no han aceptado la versión vigente.
 * ===================================================================== */
(function () {
    'use strict';

    var VERSIONS = { terms: '2026-10-15-v1', privacy: '2026-10-15-v1' };
    var UPDATE_LABEL = 'Actualización 1.9';

    var DOCS = {
        terms: {
            title: 'Términos y condiciones',
            icon: '📜',
            intro: 'Estas reglas explican cómo se usa El Sótano de Osito. Léelas completas: al aceptarlas te comprometes a cumplirlas.',
            sections: [
                ['1. Quiénes somos y qué es el sitio', [
                    'El Sótano de Osito es una página y aplicación de entretenimiento con contenido multimedia, chat en vivo, perfiles de usuario, una mascota con inteligencia artificial y funciones comunitarias. Al entrar, registrarte o usar cualquiera de estas funciones aceptas estos términos.',
                    'El sitio es operado por su creador y equipo de moderación. Las funciones pueden cambiar, mejorar o retirarse en cualquier momento, por ejemplo durante un mantenimiento o una actualización como la 1.9.'
                ]],
                ['2. Tu cuenta', [
                    'Para guardar tu perfil y usar el chat en la nube necesitas una cuenta con correo y contraseña. Debes dar datos verdaderos y mantener tu contraseña en secreto. Todo lo que ocurra desde tu cuenta es responsabilidad tuya.',
                    'Solo puedes tener una cuenta por persona. Si crees que alguien entró a tu cuenta sin permiso, cambia tu contraseña y avisa a la moderación lo antes posible.',
                    'Si eres menor de edad, debes usar el sitio con el permiso y la supervisión de tu madre, padre o tutor, quien también debe leer estos documentos.'
                ]],
                ['3. Conducta y uso permitido', [
                    'Te comprometes a tratar a las demás personas con respeto. Está prohibido acosar, insultar, amenazar, discriminar, suplantar la identidad de otra persona o compartir datos personales ajenos sin permiso.',
                    'No puedes publicar contenido ilegal, sexual, violento, engañoso o que vulnere derechos de autor u otros derechos de terceros. Tampoco puedes enviar spam, publicidad no autorizada ni enlaces peligrosos.',
                    'Está prohibido intentar dañar el sitio, saturarlo, evadir sanciones, usar programas automáticos para abusar de sus funciones o buscar fallos de seguridad para aprovecharlos. Si encuentras un error, repórtalo.'
                ]],
                ['4. Chat en vivo, perfil y contenido que publicas', [
                    'Los mensajes del chat en vivo y los datos públicos de tu perfil (nombre visible, foto, rango) pueden ser vistos por otras personas que usen el sitio. No escribas ahí información privada o sensible.',
                    'Tú conservas los derechos sobre lo que publicas, pero nos das permiso para mostrarlo, almacenarlo y moderarlo dentro del sitio para que las funciones trabajen. Puedes pedir que se elimine contenido tuyo.',
                    'La moderación puede ocultar o borrar mensajes, cambiar rangos y limitar o cerrar cuentas que incumplan estas reglas, con o sin aviso previo cuando la situación lo requiera.'
                ]],
                ['5. La mascota con inteligencia artificial', [
                    'La mascota usa modelos de inteligencia artificial de proveedores externos para responder. Sus respuestas pueden ser incorrectas, incompletas o inadecuadas; no son consejo médico, legal, financiero ni profesional.',
                    'No escribas a la mascota contraseñas, datos bancarios ni información privada de otras personas. Lo que escribas puede enviarse al proveedor de IA para generar la respuesta.',
                    'Si activas funciones de voz o llamada, el micrófono solo se usa mientras la función esté activa y con el permiso que concede tu dispositivo.'
                ]],
                ['6. Propiedad intelectual', [
                    'El nombre, el diseño, la mascota, los fondos, las animaciones, los textos y el código del sitio pertenecen a su creador o se usan con autorización. No puedes copiarlos, venderlos ni presentarlos como propios sin permiso por escrito.'
                ]],
                ['7. Disponibilidad y responsabilidad', [
                    'Hacemos lo posible para que el sitio funcione bien, pero se ofrece "tal cual", sin garantía de que esté siempre disponible o libre de errores. Puede haber cortes, mantenimientos o pérdida de datos por causas técnicas.',
                    'En la medida permitida por la ley, el sitio no se responsabiliza por daños indirectos derivados de su uso, de contenido publicado por otras personas o de enlaces externos.'
                ]],
                ['8. Sanciones y cierre de cuenta', [
                    'Si incumples estos términos podemos advertirte, silenciarte, suspender o eliminar tu cuenta. También puedes dejar de usar el sitio y solicitar el borrado de tu cuenta cuando quieras.'
                ]],
                ['9. Cambios en estos términos', [
                    'Estos términos pueden actualizarse. Cuando el cambio sea importante, como en la actualización 1.9, se te pedirá leer y aceptar de nuevo la versión vigente para seguir usando tu cuenta. Seguir usando el sitio sin aceptar no es posible cuando la aceptación es obligatoria.'
                ]],
                ['10. Aceptación', [
                    'Al marcar la casilla de aceptación o pulsar el botón de aceptar confirmas que leíste este documento completo, que lo entendiste y que estás de acuerdo con él. Se guardará la versión aceptada y la fecha y hora de tu aceptación.'
                ]]
            ]
        },
        privacy: {
            title: 'Política de privacidad',
            icon: '🔒',
            intro: 'Aquí te explicamos qué información usamos, para qué la usamos y qué puedes hacer con ella. Léela completa antes de aceptar.',
            sections: [
                ['1. Qué datos podemos recibir', [
                    'Datos de cuenta: tu correo electrónico, un identificador interno de usuario y tu contraseña (la contraseña la gestiona el servicio de autenticación y no la vemos en texto legible).',
                    'Datos de perfil: nombre visible, género que elijas, foto de perfil si decides subirla, rango y preferencias del sitio.',
                    'Contenido que generas: mensajes del chat en vivo, conversaciones con la mascota de IA, reportes y reacciones.',
                    'Datos técnicos básicos: tipo de dispositivo y navegador, ajustes de rendimiento y registros mínimos de funcionamiento y seguridad.'
                ]],
                ['2. Para qué usamos tus datos', [
                    'Para crear y mantener tu cuenta, mostrar tu perfil, hacer funcionar el chat en vivo y la mascota, aplicar la moderación, proteger el sitio contra abusos y mejorar la experiencia.',
                    'No vendemos tus datos personales ni los usamos para publicidad de terceros.'
                ]],
                ['3. Servicios de terceros que intervienen', [
                    'Usamos Firebase (Google) para autenticación, base de datos y almacenamiento de archivos como la foto de perfil. Estos servicios procesan datos según sus propias políticas.',
                    'Para las respuestas de la mascota se pueden usar proveedores de inteligencia artificial externos. El texto que escribes a la mascota puede enviarse a ellos para generar la respuesta.',
                    'El sitio también carga recursos de redes de contenido y tipografías externas, por lo que tu dispositivo puede conectarse a esos servidores para mostrarlos.'
                ]],
                ['4. Micrófono, cámara y permisos', [
                    'Las funciones de voz o llamada con la mascota solo piden el micrófono cuando las activas. Puedes negar o retirar el permiso desde los ajustes de tu dispositivo o navegador.',
                    'La lectura en voz alta de documentos usa la voz de tu propio dispositivo y no envía el texto fuera de él.'
                ]],
                ['5. Datos guardados en tu dispositivo', [
                    'Guardamos en tu dispositivo ajustes y archivos temporales (almacenamiento local y caché) para que el sitio cargue más rápido, recuerde tu modo, tu sesión y tus preferencias, y funcione mejor sin conexión.',
                    'Puedes borrarlos desde los ajustes del navegador o de la aplicación; si lo haces, tendrás que volver a configurar algunas cosas.'
                ]],
                ['6. Quién puede ver tu información', [
                    'Tu nombre visible, foto, rango y mensajes del chat en vivo pueden ser vistos por otras personas del sitio. Tu correo no se muestra públicamente.',
                    'El creador y el equipo de moderación pueden ver datos de cuenta y contenido cuando es necesario para moderar, dar soporte o cumplir la ley.'
                ]],
                ['7. Cuánto tiempo la conservamos', [
                    'Conservamos tus datos mientras tu cuenta exista y sean necesarios para las funciones del sitio. Si eliminas tu cuenta o lo solicitas, se borrarán o anonimizarán los datos asociados, salvo lo que debamos guardar por seguridad o por obligación legal.'
                ]],
                ['8. Tus derechos', [
                    'Puedes pedir acceso a tus datos, corregirlos, que se eliminen, limitar su uso o retirar tu consentimiento. Para ejercer estos derechos contacta al creador del sitio por los canales oficiales de contacto.',
                    'Si no estás de acuerdo con esta política, no puedes usar las funciones que requieren cuenta. Puedes pedir el borrado de tu cuenta en cualquier momento.'
                ]],
                ['9. Menores de edad', [
                    'Si eres menor, usa el sitio solo con permiso de tu madre, padre o tutor. No compartas datos personales como dirección, teléfono, escuela o ubicación en el chat ni con la mascota.'
                ]],
                ['10. Seguridad', [
                    'Aplicamos medidas razonables para proteger la información, como reglas de acceso a la base de datos y conexiones seguras. Aun así, ningún sistema es 100% infalible, por lo que te recomendamos usar una contraseña única y no compartirla.'
                ]],
                ['11. Cambios en esta política', [
                    'Podemos actualizar esta política. Cuando cambie de forma importante, como en la actualización 1.9, se te pedirá leerla y aceptarla de nuevo. Se guardará la versión que aceptaste junto con la fecha y hora.'
                ]],
                ['12. Aceptación', [
                    'Al marcar la casilla de aceptación o pulsar el botón de aceptar confirmas que leíste esta política completa y que consientes el tratamiento de tus datos descrito aquí.'
                ]]
            ]
        }
    };

    var root = null, bodyEl = null, state = null;
    var readFlags = { terms: false, privacy: false };
    var speaking = false, speechRun = 0;
    try {
        var saved = JSON.parse(sessionStorage.getItem('osito_legal_read') || '{}');
        if (saved && saved.v === VERSIONS.terms + VERSIONS.privacy) { readFlags.terms = !!saved.terms; readFlags.privacy = !!saved.privacy; }
    } catch (e) {}
    function persistRead() {
        try { sessionStorage.setItem('osito_legal_read', JSON.stringify({ v: VERSIONS.terms + VERSIONS.privacy, terms: readFlags.terms, privacy: readFlags.privacy })); } catch (e) {}
    }

    function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

    function currentTheme() {
        var t = document.documentElement.dataset.siteTheme;
        if (t) return t;
        var m = (document.body.className || '').match(/modo-(normal|halloween|navidad|san-valentin|cumpleanos)/);
        return m ? m[1] : 'normal';
    }

    var DECOS = {
        normal: ['🎮', '🕹️', '⚡', '👾', '💠'],
        halloween: ['🎃', '🦇', '👻', '🕸️', '🌙'],
        navidad: ['❄️', '🎄', '⭐', '🎁', '☃️'],
        'san-valentin': ['💖', '💘', '🌹', '💌', '✨'],
        cumpleanos: ['🎈', '🎉', '🎂', '🎁', '🥳']
    };

    function buildDeco() {
        var box = root.querySelector('.lg-deco');
        if (!box) return;
        var theme = currentTheme();
        root.setAttribute('data-lg-theme', theme);
        if (box.getAttribute('data-for') === theme) return;
        box.setAttribute('data-for', theme);
        var list = DECOS[theme] || DECOS.normal, h = '';
        var n = document.documentElement.classList.contains('low-end-device') ? 8 : 16;
        for (var i = 0; i < n; i++) {
            var left = (i * 100 / n + (i % 3) * 3) % 100;
            h += '<span style="left:' + left.toFixed(1) + '%;--d:' + (9 + (i * 1.7) % 9).toFixed(1) + 's;--w:' + (-(i * 1.3) % 12).toFixed(1) + 's;--s:' + (16 + (i * 7) % 20) + 'px">' + list[i % list.length] + '</span>';
        }
        box.innerHTML = h;
    }

    function makeMascot() {
        var src = document.querySelector('.ia-header-title .osito-face') || document.querySelector('.osito-face');
        var wrap = document.createElement('div');
        wrap.className = 'lg-mascot';
        if (src) {
            var c = src.cloneNode(true);
            c.removeAttribute('id');
            c.setAttribute('data-estado', 'idle');
            ['data-expr', 'data-fase', 'data-leave', 'data-boredom'].forEach(function (a) { c.removeAttribute(a); });
            c.querySelectorAll('[id]').forEach(function (n) { n.removeAttribute('id'); });
            wrap.appendChild(c);
            try { if (window.OsitoFace3D && window.OsitoFace3D.montar) window.OsitoFace3D.montar(c); } catch (e) {}
        } else {
            wrap.innerHTML = '<span class="lg-mascot-fallback">🧊</span>';
        }
        return wrap;
    }

    function build() {
        if (root) return;
        root = document.createElement('div');
        root.id = 'osito-legal-page';
        root.hidden = true;
        root.setAttribute('role', 'dialog');
        root.setAttribute('aria-modal', 'true');
        root.setAttribute('aria-labelledby', 'lg-title');
        root.innerHTML =
            '<div class="lg-bg"></div><div class="lg-deco" aria-hidden="true"></div>' +
            '<div class="lg-shell">' +
              '<header class="lg-head">' +
                '<button type="button" class="lg-btn lg-back" id="lg-back" aria-label="Volver a la pantalla anterior"><span class="lg-arrow">←</span><span>Volver</span></button>' +
                '<div class="lg-mascot-slot"></div>' +
                '<div class="lg-head-text"><span class="lg-badge" id="lg-badge">Documento legal</span><h2 id="lg-title">Información legal</h2></div>' +
              '</header>' +
              '<nav class="lg-tabs" role="tablist">' +
                '<button type="button" class="lg-tab" data-kind="terms" role="tab"><span class="lg-tab-ic">📜</span><span>Términos</span><i class="lg-check" aria-hidden="true">✓</i></button>' +
                '<button type="button" class="lg-tab" data-kind="privacy" role="tab"><span class="lg-tab-ic">🔒</span><span>Privacidad</span><i class="lg-check" aria-hidden="true">✓</i></button>' +
              '</nav>' +
              '<div class="lg-tools">' +
                '<button type="button" class="lg-btn lg-voice" id="lg-voice"><span class="lg-voice-ic">🔊</span><span id="lg-voice-t">Escuchar texto</span></button>' +
                '<div class="lg-progress" aria-hidden="true"><div class="lg-progress-bar" id="lg-bar"></div></div>' +
                '<span class="lg-pct" id="lg-pct">0%</span>' +
              '</div>' +
              '<main class="lg-scroll" id="lg-scroll" tabindex="0"><article class="lg-body" id="lg-body"></article></main>' +
              '<footer class="lg-foot">' +
                '<p class="lg-hint" id="lg-hint">Desplázate hasta el final para poder aceptar.</p>' +
                '<div class="lg-actions">' +
                  '<button type="button" class="lg-btn lg-decline" id="lg-decline">No acepto</button>' +
                  '<button type="button" class="lg-btn lg-accept" id="lg-accept" disabled>Aceptar</button>' +
                '</div>' +
              '</footer>' +
            '</div>';
        document.body.appendChild(root);
        root.querySelector('.lg-mascot-slot').appendChild(makeMascot());
        bodyEl = root.querySelector('#lg-body');

        root.querySelector('#lg-back').addEventListener('click', onBack);
        root.querySelector('#lg-decline').addEventListener('click', onDecline);
        root.querySelector('#lg-accept').addEventListener('click', onAccept);
        root.querySelector('#lg-voice').addEventListener('click', toggleVoice);
        root.querySelector('#lg-scroll').addEventListener('scroll', onScroll, { passive: true });
        root.querySelectorAll('.lg-tab').forEach(function (t) {
            t.addEventListener('click', function () { showDoc(t.getAttribute('data-kind')); });
        });
        document.addEventListener('keydown', function (e) {
            if (root.hidden) return;
            if (e.key === 'Escape' && state && state.mode !== 'gate') onBack();
        });
        window.addEventListener('popstate', function () {
            if (!root || root.hidden) return;
            if (state && state.mode === 'gate') { try { history.pushState({ osLegal: 1 }, ''); } catch (e) {} return; }
            hide();
        });
        if (window.MutationObserver) {
            new MutationObserver(function () { if (!root.hidden) buildDeco(); })
                .observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }
    }

    function showDoc(kind) {
        if (!DOCS[kind]) kind = 'terms';
        stopVoice();
        state.kind = kind;
        var d = DOCS[kind];
        var h = '<div class="lg-doc-icon">' + d.icon + '</div><h3 class="lg-doc-title">' + esc(d.title) + '</h3>' +
            '<p class="lg-meta">' + esc(UPDATE_LABEL) + ' · Versión ' + esc(VERSIONS[kind]) + '</p>' +
            '<p class="lg-intro">' + esc(d.intro) + '</p>';
        d.sections.forEach(function (s) {
            h += '<section class="lg-sec"><h4>' + esc(s[0]) + '</h4>';
            s[1].forEach(function (p) { h += '<p>' + esc(p) + '</p>'; });
            h += '</section>';
        });
        h += '<p class="lg-end">— Fin del documento —</p>';
        bodyEl.innerHTML = h;
        root.querySelector('#lg-title').textContent = d.title;
        root.querySelectorAll('.lg-tab').forEach(function (t) {
            t.classList.toggle('on', t.getAttribute('data-kind') === kind);
            t.setAttribute('aria-selected', t.getAttribute('data-kind') === kind ? 'true' : 'false');
        });
        var sc = root.querySelector('#lg-scroll');
        sc.scrollTop = 0;
        requestAnimationFrame(function () { onScroll(); });
    }

    function onScroll() {
        if (!root || root.hidden || !state) return;
        var sc = root.querySelector('#lg-scroll');
        var max = sc.scrollHeight - sc.clientHeight;
        var pct = max <= 8 ? 100 : Math.min(100, Math.round(sc.scrollTop / max * 100));
        if (readFlags[state.kind]) pct = 100;
        root.querySelector('#lg-bar').style.width = pct + '%';
        root.querySelector('#lg-pct').textContent = pct + '%';
        if (!readFlags[state.kind] && (max <= 8 || sc.scrollTop >= max - 24)) {
            readFlags[state.kind] = true;
            persistRead();
            root.classList.add('lg-just-read');
            setTimeout(function () { root.classList.remove('lg-just-read'); }, 900);
        }
        refreshFooter();
    }

    function refreshFooter() {
        var acc = root.querySelector('#lg-accept'), hint = root.querySelector('#lg-hint');
        root.querySelectorAll('.lg-tab').forEach(function (t) { t.classList.toggle('done', !!readFlags[t.getAttribute('data-kind')]); });
        var dec = root.querySelector('#lg-decline');
        if (state.mode === 'gate') {
            dec.textContent = 'No acepto (cerrar sesión)';
            dec.hidden = false;
            var both = readFlags.terms && readFlags.privacy;
            acc.disabled = !both || state.saving;
            acc.textContent = state.saving ? 'Guardando…' : 'Aceptar y continuar';
            if (both) hint.textContent = 'Listo. Ya leíste ambos documentos: puedes aceptar para continuar.';
            else if (!readFlags[state.kind]) hint.textContent = 'Desplázate hasta el final de este documento para poder aceptar.';
            else hint.textContent = 'Falta leer: ' + (!readFlags.terms ? 'Términos y condiciones' : 'Política de privacidad') + '. Cambia de pestaña arriba.';
        } else {
            dec.textContent = 'Volver sin aceptar';
            dec.hidden = false;
            acc.disabled = !readFlags[state.kind];
            acc.textContent = state.readOnly ? 'Entendido' : (state.kind === 'terms' ? 'Aceptar términos y condiciones' : 'Aceptar política de privacidad');
            hint.textContent = readFlags[state.kind] ? 'Ya lo leíste completo: puedes aceptar.' : 'Desplázate hasta el final para poder aceptar.';
        }
        acc.classList.toggle('ready', !acc.disabled);
    }

    /* ---------- Voz: lee SOLO el texto del documento ---------- */
    function docText() {
        var parts = [];
        bodyEl.querySelectorAll('.lg-intro, .lg-sec h4, .lg-sec p').forEach(function (n) { parts.push(n.textContent.trim()); });
        return parts.filter(Boolean);
    }
    function pickVoice() {
        var vs = (window.speechSynthesis && speechSynthesis.getVoices()) || [];
        var pref = ['es-MX', 'es-US', 'es-ES'];
        for (var i = 0; i < pref.length; i++) for (var j = 0; j < vs.length; j++) if (vs[j].lang && vs[j].lang.replace('_', '-') === pref[i]) return vs[j];
        for (var k = 0; k < vs.length; k++) if (vs[k].lang && vs[k].lang.toLowerCase().indexOf('es') === 0) return vs[k];
        return null;
    }
    function setVoiceUi(on) {
        speaking = on;
        var b = root && root.querySelector('#lg-voice');
        if (!b) return;
        b.classList.toggle('on', on);
        root.querySelector('#lg-voice-t').textContent = on ? 'Detener lectura' : 'Escuchar texto';
        root.querySelector('.lg-voice-ic').textContent = on ? '⏹️' : '🔊';
    }
    function stopVoice() {
        speechRun++;
        try { if (window.speechSynthesis) speechSynthesis.cancel(); } catch (e) {}
        if (root) { root.querySelectorAll('.lg-reading').forEach(function (n) { n.classList.remove('lg-reading'); }); }
        setVoiceUi(false);
    }
    function toggleVoice() {
        if (!window.speechSynthesis) { alert('Tu dispositivo no permite leer en voz alta.'); return; }
        if (speaking) { stopVoice(); return; }
        var nodes = bodyEl.querySelectorAll('.lg-intro, .lg-sec h4, .lg-sec p');
        var run = ++speechRun, idx = 0;
        setVoiceUi(true);
        var voice = pickVoice();
        (function next() {
            if (run !== speechRun) return;
            if (idx >= nodes.length) { setVoiceUi(false); return; }
            var node = nodes[idx++];
            var txt = node.textContent.trim();
            if (!txt) return next();
            root.querySelectorAll('.lg-reading').forEach(function (n) { n.classList.remove('lg-reading'); });
            node.classList.add('lg-reading');
            try { node.scrollIntoView({ block: 'center', behavior: 'smooth' }); } catch (e) {}
            var u = new SpeechSynthesisUtterance(txt);
            u.lang = voice ? voice.lang : 'es-MX';
            if (voice) u.voice = voice;
            u.rate = 1;
            u.onend = next;
            u.onerror = function () { if (run === speechRun) setVoiceUi(false); };
            speechSynthesis.speak(u);
        })();
    }
    if (window.speechSynthesis) { try { speechSynthesis.getVoices(); } catch (e) {} }

    /* ---------- Abrir / cerrar ---------- */
    function show(kind, opts) {
        build();
        state = { kind: kind || 'terms', mode: (opts && opts.mode) || 'view', onAccept: opts && opts.onAccept, onClose: opts && opts.onClose, uid: opts && opts.uid, saving: false, prevFocus: document.activeElement };
        root.setAttribute('data-mode', state.mode);
        root.querySelector('#lg-badge').textContent = state.mode === 'gate' ? UPDATE_LABEL + ' · Obligatorio' : 'Documento legal';
        root.querySelector('.lg-tabs').classList.toggle('lg-single', state.mode !== 'gate' && false);
        root.querySelector('#lg-back').hidden = state.mode === 'gate';
        buildDeco();
        root.hidden = false;
        document.documentElement.classList.add('lg-open');
        try { history.pushState({ osLegal: 1 }, ''); state.pushed = true; } catch (e) {}
        showDoc(state.kind);
        refreshFooter();
        setTimeout(function () { try { root.querySelector('#lg-scroll').focus({ preventScroll: true }); } catch (e) {} }, 60);
    }

    function hide() {
        stopVoice();
        if (!root) return;
        root.hidden = true;
        document.documentElement.classList.remove('lg-open');
        var cb = state && state.onClose;
        var pf = state && state.prevFocus;
        state = null;
        try { if (pf && pf.focus) pf.focus({ preventScroll: true }); } catch (e) {}
        if (typeof cb === 'function') cb();
    }

    function leave() {
        // Vuelve a la pantalla/pestaña anterior (quita la entrada del historial que agregamos).
        if (state && state.pushed && history.state && history.state.osLegal) { history.back(); }
        else hide();
    }

    function onBack() { leave(); }

    function onDecline() {
        if (state.mode === 'gate') { doLogout(); return; }
        leave();
    }

    function onAccept() {
        var st = state;
        if (!st) return;
        if (st.mode === 'gate') {
            if (!(readFlags.terms && readFlags.privacy)) return;
            st.saving = true; refreshFooter();
            saveConsent(st.uid).then(function () {
                markAccepted(st.uid);
                st.mode = 'view'; // permite cerrar sin bloquear
                if (st.pushed && history.state && history.state.osLegal) { history.back(); } else hide();
            }).catch(function (err) {
                st.saving = false; refreshFooter();
                var h = root.querySelector('#lg-hint');
                h.textContent = 'No se pudo guardar tu aceptación. Revisa tu conexión e inténtalo de nuevo.';
                console.warn('[Legal] guardado falló', err);
            });
            return;
        }
        var kind = st.kind, cb = st.onAccept;
        if (!readFlags[kind]) return;
        if (typeof cb === 'function') cb(kind);
        leave();
    }

    /* ---------- Aceptación de cuentas existentes ---------- */
    function cacheKey(uid) { return 'osito_legal_ok_' + uid; }
    function versionTag() { return VERSIONS.terms + '|' + VERSIONS.privacy; }
    function markAccepted(uid) { if (uid) { try { localStorage.setItem(cacheKey(uid), versionTag()); } catch (e) {} } }
    function hasCache(uid) { try { return localStorage.getItem(cacheKey(uid)) === versionTag(); } catch (e) { return false; } }

    function saveConsent(uid) {
        if (!window.dbFirebase || !window.docFirebase || !window.setDocFirebase || !uid) return Promise.reject(new Error('sin base de datos'));
        var now = new Date().toISOString();
        return window.setDocFirebase(window.docFirebase(window.dbFirebase, 'users', uid), {
            legalConsents: {
                terms: { accepted: true, version: VERSIONS.terms, acceptedAt: now },
                privacy: { accepted: true, version: VERSIONS.privacy, acceptedAt: now },
                update: '1.9'
            }
        }, { merge: true });
    }

    function isAccepted(data) {
        var c = data && data.legalConsents;
        return !!(c && c.terms && c.terms.accepted && c.terms.version === VERSIONS.terms &&
            c.privacy && c.privacy.accepted && c.privacy.version === VERSIONS.privacy);
    }

    function doLogout() {
        stopVoice();
        var btn = document.getElementById('auth-logout');
        var uid = state && state.uid;
        if (state) state.mode = 'view';
        if (root && !root.hidden) { root.hidden = true; document.documentElement.classList.remove('lg-open'); }
        state = null;
        try { if (history.state && history.state.osLegal) history.back(); } catch (e) {}
        if (btn) { btn.click(); return; }
        try { if (window.signOutFirebase && window.firebaseAuth) window.signOutFirebase(window.firebaseAuth); } catch (e) {}
        try { localStorage.removeItem(cacheKey(uid)); } catch (e) {}
    }

    var checking = false;
    function checkUser(uid, attempt) {
        attempt = attempt || 0;
        if (!uid || checking) return;
        if (hasCache(uid)) return;
        if (window.__ositoRegistering && attempt < 20) { setTimeout(function () { checkUser(uid, attempt + 1); }, 800); return; }
        if (!window.dbFirebase || !window.docFirebase || !window.getDocFirebase) {
            if (attempt < 15) setTimeout(function () { checkUser(uid, attempt + 1); }, 600);
            return;
        }
        checking = true;
        window.getDocFirebase(window.docFirebase(window.dbFirebase, 'users', uid)).then(function (snap) {
            checking = false;
            if (window.__ositoRegistering) { setTimeout(function () { checkUser(uid, 1); }, 1000); return; }
            var data = snap && (typeof snap.data === 'function' ? snap.data() : null);
            if (isAccepted(data)) { markAccepted(uid); return; }
            if (window.firebaseAuth && window.firebaseAuth.currentUser && window.firebaseAuth.currentUser.uid !== uid) return;
            if (root && !root.hidden && state && state.mode === 'gate') return;
            show('terms', { mode: 'gate', uid: uid });
        }).catch(function (e) {
            checking = false;
            console.warn('[Legal] no se pudo comprobar la aceptación', e);
            if (attempt < 3) setTimeout(function () { checkUser(uid, attempt + 1); }, 2500);
        });
    }

    document.addEventListener('osito:auth-ready', function (ev) {
        var uid = ev && ev.detail && ev.detail.uid;
        if (!uid) {
            if (state && state.mode === 'gate') { state.mode = 'view'; hide(); }
            return;
        }
        setTimeout(function () { checkUser(uid); }, 900);
    });

    /* ---------- Registro: casillas solo tras leer ---------- */
    function syncLegal() {
        var t = document.getElementById('auth-accept-terms'), pv = document.getElementById('auth-accept-privacy'), lg = document.getElementById('auth-accept-legal');
        if (!lg) return;
        if (t) { t.checked = lg.checked; }
        if (pv) { pv.checked = lg.checked; }
    }
    function wireRegister() {
        var lg = document.getElementById('auth-accept-legal');
        if (!lg || lg.__lgWired) return;
        lg.__lgWired = true;
        lg.addEventListener('click', function (ev) {
            if (!lg.checked) { syncLegal(); return; } // quitar la marca siempre se puede
            if (readFlags.terms && readFlags.privacy) { syncLegal(); return; }
            ev.preventDefault();
            ev.stopPropagation();
            openFromRegister(!readFlags.terms ? 'terms' : 'privacy');
        }, true);
        var note = document.querySelector('#auth-legal-consents small');
        if (note) note.textContent = 'Lee los dos documentos (pestañas Términos y Privacidad) hasta el final para poder aceptar.';
    }
    function openFromRegister(kind) {
        show(kind, {
            mode: 'view',
            onAccept: function () {
                var lg = document.getElementById('auth-accept-legal');
                if (readFlags.terms && readFlags.privacy) {
                    if (lg) { lg.checked = true; syncLegal(); lg.dispatchEvent(new Event('change', { bubbles: true })); }
                } else {
                    // falta el otro documento: se abre solo para que lo leas
                    setTimeout(function () { openFromRegister(!readFlags.terms ? 'terms' : 'privacy'); }, 350);
                }
            }
        });
    }

    document.addEventListener('click', function (ev) {
        var b = ev.target && ev.target.closest && ev.target.closest('[data-legal-open]');
        if (!b) return;
        ev.preventDefault();
        ev.stopImmediatePropagation();
        openFromRegister(b.getAttribute('data-legal-open'));
    }, true);

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', wireRegister); else wireRegister();
    setTimeout(wireRegister, 1500);

    /* ---------- Acceso permanente (menú y final de la página), para todos ---------- */
    function openFromMenu(kind) {
        try { if (typeof window.toggleHeaderMenu === 'function') window.toggleHeaderMenu(false); } catch (e) {}
        show(kind, { mode: 'view', onAccept: function () {} });
        // Si lo abren desde el menú, el botón de aceptar solo confirma la lectura.
        var acc = root.querySelector('#lg-accept');
        if (acc) { acc.textContent = 'Entendido'; }
        state.readOnly = true;
    }
    function mkBtn(cls, kind, ic, txt) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = cls; b.setAttribute('data-lg-extra', kind);
        b.innerHTML = '<span aria-hidden="true">' + ic + '</span><span>' + txt + '</span>';
        b.addEventListener('click', function () { openFromMenu(kind); });
        return b;
    }
    function mkOne(cls) {
        var b = document.createElement('button');
        b.type = 'button'; b.className = cls; b.setAttribute('data-lg-extra', 'both');
        b.innerHTML = '<span aria-hidden="true">📜🔒</span><span>Política y privacidad</span>';
        b.addEventListener('click', function () { openFromMenu('terms'); });
        return b;
    }
    function mountAccess() {
        // Un solo botón "Política y privacidad". En PC solo va abajo; en celular también en el menú.
        var dd = document.getElementById('header-menu-dropdown');
        if (dd) {
            dd.querySelectorAll('[data-lg-extra="terms"],[data-lg-extra="privacy"]').forEach(function (n) { n.remove(); });
            if (!dd.querySelector('[data-lg-extra="both"]')) {
                var back = dd.querySelector('#mobile-menu-back');
                dd.insertBefore(mkOne('btn-action btn-legal-menu'), back || null);
            }
        }
        var old = document.querySelector('.legal-footer-links');
        if (old && !old.querySelector('[data-lg-extra="both"]')) { old.remove(); old = null; }
        var ft = document.querySelector('main footer, footer');
        if (ft && !document.querySelector('.legal-footer-links')) {
            var w = document.createElement('div');
            w.className = 'legal-footer-links';
            w.appendChild(mkOne(''));
            ft.parentNode.insertBefore(w, ft);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mountAccess); else mountAccess();
    setInterval(mountAccess, 2000);

    window.OsitoLegal = {
        versions: VERSIONS,
        open: function (kind) { openFromRegister(kind || 'terms'); },
        markAccepted: markAccepted,
        isRead: function (k) { return !!readFlags[k]; },
        check: checkUser
    };
}());
