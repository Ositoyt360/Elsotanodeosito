(function () {
    'use strict';
    var docs = [
        ['privacidad', 'Política de privacidad', 'El Sótano de Osito usa Firebase para la autenticación y los datos de la aplicación. El proyecto puede tratar el correo, perfil, foto cargada voluntariamente, mensajes del chat, conversaciones de IA y preferencias locales necesarias para operar las funciones elegidas.'],
        ['terminos', 'Términos y condiciones', 'Usa el servicio de forma lícita y respetuosa. Protege tus credenciales y no intentes acceder a cuentas, datos o funciones de otras personas. Los cambios que requieran una nueva aceptación deben mostrarse antes de habilitar las funciones afectadas.'],
        ['almacenamiento', 'Cookies y almacenamiento local', 'El navegador puede conservar la sesión autenticada y las preferencias de interfaz o rendimiento. Borrar estos datos desde el navegador puede cerrar la sesión o restablecer preferencias.'],
        ['comunidad', 'Normas de comunidad', 'No publiques acoso, amenazas, odio, spam, enlaces maliciosos, datos de terceros sin permiso ni contenido ilegal. El contenido puede moderarse para proteger la comunidad.'],
        ['ia', 'Uso de funciones de inteligencia artificial', 'Las respuestas de IA pueden ser erróneas o incompletas y no sustituyen asesoría profesional. No envíes secretos, contraseñas ni datos sensibles de terceros.'],
        ['eliminacion', 'Eliminación de cuentas y datos', 'La eliminación debe tramitarse únicamente para la cuenta propia. No se debe prometer la desaparición instantánea de copias de seguridad, registros de seguridad o datos que legalmente deban conservarse.'],
        ['seguridad', 'Seguridad, limitaciones y contacto', 'El proyecto usa autenticación y reglas de acceso de Firebase, pero ningún sistema garantiza seguridad absoluta. El titular debe completar un canal de contacto verificable y revisar estos documentos profesionalmente antes de su publicación definitiva.'],
        ['contenido', 'Contenido compartido e información', 'Eres responsable del contenido que publicas. Los mensajes del chat pueden ser vistos por la comunidad y se procesan para mostrarlos, sincronizarlos y moderar abusos.']
    ];
    var dialog, active = docs[0], previous;
    function installed() { return ['file:', 'capacitor:', 'app:'].indexOf(location.protocol) >= 0 || !!window.AndroidBridge || (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches); }
    function stop() { if ('speechSynthesis' in window) window.speechSynthesis.cancel(); }
    function render(doc) {
        active = doc;
        var content = dialog.querySelector('.legal-content');
        content.innerHTML = '<h1>' + doc[1] + '</h1><p class="legal-version">Versión 1.0 — 15 de octubre de 2026</p><div class="legal-reader"><button type="button" data-read>▶ Escuchar este documento</button><button type="button" data-stop>■ Detener</button><p class="legal-reader-status" aria-live="polite">La lectura usa la voz disponible en este navegador.</p></div><article id="legal-document-text"><p>' + doc[2] + '</p></article>';
        dialog.querySelectorAll('[data-doc]').forEach(function (btn) { btn.setAttribute('aria-current', String(btn.dataset.doc === doc[0])); });
        stop();
    }
    function make() {
        if (dialog) return;
        dialog = document.createElement('div'); dialog.className = 'legal-dialog'; dialog.setAttribute('role', 'dialog'); dialog.setAttribute('aria-modal', 'true'); dialog.setAttribute('aria-label', 'Políticas y documentos legales');
        dialog.innerHTML = '<div class="legal-dialog__panel"><aside class="legal-sidebar"><div class="legal-brand"><span class="legal-cubit" aria-hidden="true">🐻</span><span>Cubit te acompaña</span></div><nav class="legal-nav">' + docs.map(function (doc) { return '<button type="button" data-doc="' + doc[0] + '">' + doc[1] + '</button>'; }).join('') + '</nav></aside><main class="legal-content"></main><button class="legal-close" type="button" aria-label="Cerrar políticas">×</button></div>';
        document.body.appendChild(dialog);
        dialog.addEventListener('click', function (event) {
            if (event.target === dialog || event.target.closest('.legal-close')) return close();
            var btn = event.target.closest('[data-doc]'); if (btn) { var doc = docs.find(function (item) { return item[0] === btn.dataset.doc; }); if (doc) render(doc); }
            if (event.target.closest('[data-stop]')) { stop(); dialog.querySelector('.legal-reader-status').textContent = 'Lectura detenida.'; }
            if (event.target.closest('[data-read]')) { if (!('speechSynthesis' in window)) return; stop(); var speech = new SpeechSynthesisUtterance(dialog.querySelector('#legal-document-text').innerText); speech.lang = 'es-419'; window.speechSynthesis.speak(speech); dialog.querySelector('.legal-reader-status').textContent = 'Leyendo: ' + active[1] + '.'; }
        });
    }
    function open() { var legalTab = window.open('politicas.html', '_blank'); if (!legalTab) window.location.href = 'politicas.html'; }
    function close() { if (!dialog) return; stop(); dialog.classList.remove('is-open'); document.documentElement.classList.remove('legal-open'); if (previous && previous.focus) previous.focus(); }
    function bind() { document.querySelectorAll('[data-policies-open]').forEach(function (button) { button.addEventListener('click', open); }); document.querySelectorAll('[data-app-download]').forEach(function (link) { link.hidden = installed(); }); document.addEventListener('keydown', function (event) { if (event.key === 'Escape' && dialog && dialog.classList.contains('is-open')) close(); }); }
    window.abrirPoliticas = open; window.cerrarPoliticas = close;
    window.ositoConsentimientoRegistroValido = function () { return Boolean(document.getElementById('auth-terms-consent') && document.getElementById('auth-terms-consent').checked && document.getElementById('auth-privacy-consent') && document.getElementById('auth-privacy-consent').checked); };
    window.guardarConsentimientosRegistro = async function (user) {
        if (!user || !user.uid || !window.dbFirebase || !window.docFirebase || !window.setDocFirebase) throw new Error('No se pudo guardar la aceptación de los documentos.');
        var acceptedAt = Date.now(), entry = { version: '1.0', acceptedAt: acceptedAt, documents: ['terms', 'privacy'] }, payload = { legalConsents: { terms: { version: '1.0', acceptedAt: acceptedAt }, privacy: { version: '1.0', acceptedAt: acceptedAt } }, legalConsentUpdatedAt: acceptedAt };
        if (typeof window.arrayUnionFirebase === 'function') payload.legalConsentHistory = window.arrayUnionFirebase(entry);
        await window.setDocFirebase(window.docFirebase(window.dbFirebase, 'users', user.uid), payload, { merge: true });
    };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true }); else bind();
})();
