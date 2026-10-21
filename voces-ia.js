/*
 * voces-ia.js — Selector de voces de Cubit (estilo ChatGPT)
 * Mujer / Hombre + acento o idioma: El Salvador, Latinoamérica, Argentina, Centroamérica, España,
 * inglés, francés y portugués. Las voces las genera el SERVIDOR (voz neuronal) y el celular solo
 * reproduce el audio, así suenan igual en Android, iPhone y el APK.
 * Guarda la elección en localStorage "osito_voz_id" (ej. es-sv-f). voz-respaldo.js la usa al hablar,
 * ia-openai.js se la manda a la IA (para que conteste en ese idioma) y gemini-live.js a la voz en vivo.
 */
(function () {
    'use strict';
    if (window.__ositoVocesIA) return;
    window.__ositoVocesIA = true;

    // [base, nombre, grupo, idioma]
    var VOCES = [
        ['es-sv', 'El Salvador 🇸🇻', 'Español', 'es'],
        ['es-mx', 'Latinoamérica (neutro)', 'Español', 'es'],
        ['es-ar', 'Argentina 🇦🇷', 'Español', 'es'],
        ['es-gt', 'Guatemala 🇬🇹 (Centroamérica)', 'Español', 'es'],
        ['es-hn', 'Honduras 🇭🇳 (Centroamérica)', 'Español', 'es'],
        ['es-ni', 'Nicaragua 🇳🇮 (Centroamérica)', 'Español', 'es'],
        ['es-cr', 'Costa Rica 🇨🇷 (Centroamérica)', 'Español', 'es'],
        ['es-pa', 'Panamá 🇵🇦 (Centroamérica)', 'Español', 'es'],
        ['es-co', 'Colombia 🇨🇴', 'Español', 'es'],
        ['es-es', 'España 🇪🇸', 'Español', 'es'],
        ['en-us', 'English (US) 🇺🇸', 'Otros idiomas', 'en'],
        ['en-gb', 'English (UK) 🇬🇧', 'Otros idiomas', 'en'],
        ['fr-fr', 'Français 🇫🇷', 'Otros idiomas', 'fr'],
        ['pt-br', 'Português (Brasil) 🇧🇷', 'Otros idiomas', 'pt'],
        ['pt-pt', 'Português (Portugal) 🇵🇹', 'Otros idiomas', 'pt']
    ];
    var FRASES = {
        es: '¡Hola! Así suena mi voz para platicar contigo en El Sótano de Osito.',
        en: 'Hi! This is how my voice sounds when we chat in Osito\'s Basement.',
        fr: 'Salut ! Voici ma voix pour discuter avec toi dans le Sous-sol d\'Osito.',
        pt: 'Olá! É assim que a minha voz soa quando conversamos no Porão do Osito.'
    };

    function leer() { try { return localStorage.getItem('osito_voz_id') || 'es-mx-f'; } catch (e) { return 'es-mx-f'; } }
    function guardar(id) { try { localStorage.setItem('osito_voz_id', id); } catch (e) {} }
    function partes(id) { var m = /^(.+)-([fm])$/.exec(id); return m ? { base: m[1], g: m[2] } : { base: 'es-mx', g: 'f' }; }
    function infoBase(base) { for (var i = 0; i < VOCES.length; i++) if (VOCES[i][0] === base) return VOCES[i]; return VOCES[1]; }

    function construir() {
        var grid = document.querySelector('#ai-mic-config-panel .ai-mic-config-grid');
        if (!grid || document.getElementById('osito-voces-bloque')) return !!document.getElementById('osito-voces-bloque');

        // El selector viejo (voces del teléfono, con límite de 1 cambio por hora) se oculta: ahora mandan las voces del servidor.
        var viejo = document.getElementById('ai-cfg-voice-select');
        if (viejo) { var lab = viejo.closest('label'); if (lab) lab.style.display = 'none'; }

        var actual = partes(leer());
        var bloque = document.createElement('div');
        bloque.id = 'osito-voces-bloque';
        bloque.style.cssText = 'grid-column:1 / -1;display:flex;flex-direction:column;gap:8px;padding:10px;border-radius:12px;border:1px solid rgba(0,242,254,.35);background:rgba(0,242,254,.07)';
        bloque.innerHTML =
            '<span style="font-size:.82rem;font-weight:800;color:#00f2fe">🎙️ Voz de Cubit</span>' +
            '<div id="osito-voz-genero" role="group" aria-label="Tipo de voz" style="display:flex;gap:8px">' +
                '<button type="button" data-g="f" style="flex:1"></button>' +
                '<button type="button" data-g="m" style="flex:1"></button>' +
            '</div>' +
            '<select id="osito-voz-base" aria-label="Acento o idioma" style="width:100%;font-size:.84rem;padding:8px 10px"></select>' +
            '<button type="button" id="osito-voz-probar" style="padding:8px 10px;border-radius:10px;border:1px solid rgba(0,242,254,.55);background:rgba(0,242,254,.14);color:#eaf8ff;font-weight:800;font-size:.82rem;cursor:pointer">🔊 Probar esta voz</button>' +
            '<small id="osito-voz-info" style="opacity:.75;font-size:.72rem;line-height:1.3"></small>';
        grid.insertBefore(bloque, grid.firstChild);

        var selBase = bloque.querySelector('#osito-voz-base');
        var grupos = {};
        VOCES.forEach(function (v) {
            if (!grupos[v[2]]) { var og = document.createElement('optgroup'); og.label = v[2]; grupos[v[2]] = og; selBase.appendChild(og); }
            var o = document.createElement('option'); o.value = v[0]; o.textContent = v[1]; grupos[v[2]].appendChild(o);
        });
        selBase.value = actual.base;

        var btnF = bloque.querySelector('[data-g="f"]'), btnM = bloque.querySelector('[data-g="m"]');
        btnF.textContent = '👩 Mujer'; btnM.textContent = '👨 Hombre';
        var info = bloque.querySelector('#osito-voz-info');

        function pintar() {
            var p = partes(leer());
            [btnF, btnM].forEach(function (b) {
                var on = b.getAttribute('data-g') === p.g;
                b.style.cssText = 'flex:1;padding:8px 10px;border-radius:10px;font-weight:800;font-size:.84rem;cursor:pointer;border:1px solid ' +
                    (on ? '#00f2fe' : 'rgba(255,255,255,.25)') + ';background:' + (on ? 'rgba(0,242,254,.28)' : 'rgba(255,255,255,.06)') + ';color:#fff';
                b.setAttribute('aria-pressed', on ? 'true' : 'false');
            });
            var v = infoBase(p.base);
            info.textContent = v[3] === 'es'
                ? 'Cubit hablará en español con acento ' + v[1].replace(/\s*\(.*\)|\s*[\u{1F1E6}-\u{1F1FF}]+/gu, '').trim() + '.'
                : 'Cubit responderá en ' + ({ en: 'inglés', fr: 'francés', pt: 'portugués' })[v[3]] + ' mientras tengas esta voz.';
        }
        function cambiar(base, g) {
            guardar(base + '-' + g);
            try { if (window.OsitoTTSRespaldo) window.OsitoTTSRespaldo.parar(); } catch (e) {}
            pintar();
        }
        function probar() {
            var p = partes(leer()), v = infoBase(p.base);
            if (!window.OsitoTTSRespaldo) { info.textContent = 'La voz todavía no está lista, intenta de nuevo.'; return; }
            window.OsitoTTSRespaldo.desbloquear();
            window.OsitoTTSRespaldo.decir(FRASES[v[3]] || FRASES.es, 1).catch(function () {
                info.textContent = '🔇 No se pudo reproducir. Sube el volumen multimedia y revisa tu internet.';
            });
        }
        btnF.addEventListener('click', function () { cambiar(partes(leer()).base, 'f'); probar(); });
        btnM.addEventListener('click', function () { cambiar(partes(leer()).base, 'm'); probar(); });
        selBase.addEventListener('change', function () { cambiar(selBase.value, partes(leer()).g); probar(); });
        bloque.querySelector('#osito-voz-probar').addEventListener('click', probar);
        pintar();
        return true;
    }

    function iniciar() {
        if (construir()) return;
        var n = 0, t = setInterval(function () { if (construir() || ++n > 60) clearInterval(t); }, 500);
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar); else iniciar();

    window.OsitoVoces = { actual: leer, elegir: function (id) { guardar(id); } };
})();
