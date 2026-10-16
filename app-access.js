(function () {
    'use strict';

    const DOCUMENT_VERSION = '1.0 — 15 de octubre de 2026';
    const legalDocuments = [
        {
            id: 'privacidad', title: 'Política de privacidad',
            sections: [
                ['Alcance', 'Esta política describe el tratamiento de información dentro de El Sótano de Osito. Aplica a la cuenta, al perfil, al chat en vivo, a las conversaciones con la IA y a las funciones que la persona elija usar.'],
                ['Información que usa la aplicación', 'El proyecto maneja la dirección de correo de la cuenta, nombre visible derivado del correo, foto de perfil si se carga, la selección de género disponible en el formulario, mensajes del chat, conversaciones de IA y preferencias locales necesarias para recordar la sesión, colores o ajustes. También puede tratar archivos que la persona envíe voluntariamente a las funciones que los admitan.'],
                ['Dónde se guarda', 'La autenticación y los datos de la aplicación se integran con Firebase. Los datos del perfil se guardan en la colección users; las conversaciones de IA se asocian a la cuenta y los mensajes del chat incluyen la identidad visible de quien los publica. El navegador también guarda preferencias y datos de sesión en su almacenamiento local.'],
                ['Decisiones de la persona', 'No compartas datos personales de terceros. Puedes actualizar tu perfil o dejar de usar el servicio. La eliminación de cuenta y los plazos de conservación deben describirse de manera definitiva antes de publicar esta política; el titular debe completar los datos de contacto y la base jurídica aplicable con asesoría profesional.']
            ]
        },
        {
            id: 'terminos', title: 'Términos y condiciones',
            sections: [
                ['Uso del servicio', 'El Sótano de Osito ofrece contenido, comunidad y herramientas interactivas. Debes usarlo de forma lícita, respetuosa y de acuerdo con estas reglas y las normas de cada plataforma vinculada.'],
                ['Cuenta y acceso', 'La persona es responsable de cuidar sus credenciales y de la actividad realizada desde su cuenta. No debe intentar acceder a cuentas, datos o funciones de otras personas sin autorización.'],
                ['Cambios', 'Las funciones y estos documentos pueden cambiar. Cuando un cambio requiera una nueva aceptación, la aplicación debe pedirla antes de habilitar las funciones afectadas. La fecha y la versión visible permiten saber qué texto se está consultando.']
            ]
        },
        {
            id: 'almacenamiento', title: 'Cookies y almacenamiento local',
            sections: [
                ['Qué se utiliza', 'La aplicación usa el almacenamiento local del navegador para recordar ajustes de interfaz, preferencias de rendimiento, datos de sesión y otras opciones necesarias para que la experiencia continúe entre visitas. Firebase puede usar almacenamiento del navegador para mantener una sesión autenticada.'],
                ['Cómo controlarlo', 'Puedes borrar el almacenamiento del sitio desde los ajustes del navegador. Hacerlo puede cerrar la sesión o restablecer preferencias. La aplicación no debe presentar estas tecnologías como equivalentes a cookies publicitarias si no se han configurado como tales.']
            ]
        },
        {
            id: 'comunidad', title: 'Normas de comunidad',
            sections: [
                ['Convivencia', 'No publiques acoso, amenazas, odio, contenido sexual no consentido, datos personales de terceros, suplantaciones, spam, enlaces maliciosos ni contenido ilegal.'],
                ['Moderación', 'El contenido puede ser moderado para proteger a la comunidad y operar el servicio. Las medidas disponibles dependen de las herramientas reales de la aplicación y no sustituyen la denuncia ante autoridades cuando exista un riesgo inmediato.'],
                ['Contenido de menores', 'No compartas información personal de menores ni contenido que los ponga en riesgo. El titular debe definir y publicar la edad mínima y el procedimiento de protección aplicable antes de promover el servicio para menores.']
            ]
        },
        {
            id: 'ia', title: 'Uso de funciones de inteligencia artificial',
            sections: [
                ['Cómo funciona', 'La aplicación incluye funciones de conversación y voz asistidas por IA. Las respuestas pueden ser incorrectas, incompletas o inadecuadas para un caso particular; no deben usarse como asesoría médica, legal, financiera ni de emergencia.'],
                ['Información enviada', 'El texto, las imágenes o el audio que envíes a una función de IA pueden ser procesados por los servicios configurados por el titular. No introduzcas secretos, contraseñas, datos de salud ni información sensible de otras personas salvo que el titular haya publicado una base legal y medidas específicas para ello.'],
                ['Voz', 'La lectura de documentos legales usa la síntesis de voz disponible en el navegador cuando existe. Las voces, idiomas y disponibilidad cambian según el dispositivo y el navegador.']
            ]
        },
        {
            id: 'eliminacion', title: 'Eliminación de cuentas y datos',
            sections: [
                ['Solicitud', 'La aplicación debe ofrecer una ruta clara para que cada persona solicite la eliminación de su propia cuenta. Antes de afirmar que una eliminación es completa, el titular debe implementar y verificar el flujo contra Firebase Authentication, Firestore, almacenamiento y cualquier backend que realmente use.'],
                ['Límites reales', 'Una eliminación no garantiza que desaparezcan al instante copias de seguridad, registros de seguridad, datos exigidos por ley o contenido compartido que deba anonimizarse. El responsable debe publicar los plazos de conservación y un contacto para ejercer derechos.'],
                ['Contenido compartido', 'Los mensajes y publicaciones pueden requerir eliminación o anonimización sin afectar datos de otras personas. No deben utilizarse los permisos de una cuenta para borrar contenidos ajenos.']
            ]
        },
        {
            id: 'seguridad', title: 'Seguridad, limitaciones y contacto',
            sections: [
                ['Seguridad', 'El proyecto usa autenticación y reglas de acceso de Firebase. Ningún sistema puede prometer seguridad absoluta. Mantén una contraseña única, cierra la sesión en equipos compartidos y avisa al responsable si detectas una vulnerabilidad.'],
                ['Limitaciones', 'La disponibilidad, conectividad, notificaciones, reproducción de audio e instalación pueden variar por navegador, sistema operativo y red. Las funciones no deben entenderse como una garantía de funcionamiento continuo.'],
                ['Contacto pendiente', 'Antes de publicar esta política como versión definitiva, el titular debe completar aquí un correo o canal de contacto verificable, la identidad del responsable y la jurisdicción aplicable. Esta interfaz no sustituye una revisión legal profesional.']
            ]
        },
        {
            id: 'contenido', title: 'Contenido compartido e información',
            sections: [
                ['Responsabilidad del contenido', 'Conservas la responsabilidad sobre lo que publicas. Solo comparte material que tengas derecho a usar y no infrinja derechos de autor, privacidad, imagen u otros derechos de terceros.'],
                ['Visibilidad', 'Los mensajes del chat están diseñados para ser vistos por personas que participan en la comunidad. La información del perfil que se muestra junto a un mensaje puede ser visible con él. Piensa antes de publicar.'],
                ['Tratamiento', 'El contenido puede almacenarse y procesarse para mostrarlo, sincronizarlo entre dispositivos, prevenir abuso y operar las funciones solicitadas. Cualquier uso adicional debe ser explicado por el titular antes de realizarse.']
            ]
        }
    ];

    let dialog;
    let currentDocument = legalDocuments[0];
    let lastFocused;
    let deferredInstallPrompt = null;

    const isInstalled = () => window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true || ['file:', 'capacitor:', 'app:'].includes(location.protocol) || Boolean(window.AndroidBridge);

    function syncDownloadVisibility() {
        document.querySelectorAll('[data-app-download]').forEach((item) => {
            item.hidden = isInstalled();
        });
    }

    function readerControls() {
        return `<div class="legal-reader" aria-label="Controles de lectura en voz alta">
            <button type="button" data-reader="start">▶ Escuchar esta sección</button>
            <button type="button" data-reader="pause">⏸ Pausar</button>
            <button type="button" data-reader="resume">↻ Reanudar</button>
            <button type="button" data-reader="stop">■ Detener</button>
            <p class="legal-reader-status" aria-live="polite">La lectura usa la voz disponible en este navegador.</p>
        </div>`;
    }

    function renderDocument(documentData) {
        currentDocument = documentData;
        const content = dialog.querySelector('.legal-content');
        content.innerHTML = `<h1>${documentData.title}</h1><p class="legal-version">Versión ${DOCUMENT_VERSION}</p>${readerControls()}<article id="legal-document-text">${documentData.sections.map(([heading, copy]) => `<section><h2>${heading}</h2><p>${copy}</p></section>`).join('')}</article>`;
        dialog.querySelectorAll('[data-legal-document]').forEach((button) => {
            button.setAttribute('aria-current', String(button.dataset.legalDocument === documentData.id));
        });
        content.scrollTop = 0;
        stopReading();
    }

    function createDialog() {
        if (dialog) return dialog;
        dialog = document.createElement('div');
        dialog.className = 'legal-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-modal', 'true');
        dialog.setAttribute('aria-label', 'Políticas y documentos legales');

        const mascot = document.querySelector('.ia-bubble-icon .osito-face, .ia-call-mascot .osito-face');
        const cubit = mascot ? mascot.cloneNode(true).outerHTML : '<span aria-hidden="true">🐻</span>';
        dialog.innerHTML = `<div class="legal-dialog__panel">
            <aside class="legal-sidebar">
                <div class="legal-brand"><span class="legal-cubit" aria-hidden="true">${cubit}</span><span>Cubit te acompaña</span></div>
                <nav class="legal-nav" aria-label="Documentos legales">${legalDocuments.map((item) => `<button type="button" data-legal-document="${item.id}">${item.title}</button>`).join('')}</nav>
            </aside>
            <main class="legal-content"></main>
            <button class="legal-close" type="button" aria-label="Cerrar políticas">×</button>
        </div>`;
        document.body.appendChild(dialog);

        dialog.addEventListener('click', (event) => {
            if (event.target === dialog) closeLegalViewer();
            const documentButton = event.target.closest('[data-legal-document]');
            if (documentButton) {
                const selected = legalDocuments.find((item) => item.id === documentButton.dataset.legalDocument);
                if (selected) renderDocument(selected);
            }
            if (event.target.closest('.legal-close')) closeLegalViewer();
            const readerAction = event.target.closest('[data-reader]')?.dataset.reader;
            if (readerAction) handleReaderAction(readerAction);
        });
        return dialog;
    }

    function readerStatus(message) {
        const status = dialog?.querySelector('.legal-reader-status');
        if (status) status.textContent = message;
    }

    function stopReading() {
        if ('speechSynthesis' in window) window.speechSynthesis.cancel();
    }

    function handleReaderAction(action) {
        if (!('speechSynthesis' in window)) {
            readerStatus('Este navegador no ofrece lectura por voz.');
            return;
        }
        if (action === 'stop') {
            stopReading();
            readerStatus('Lectura detenida.');
            return;
        }
        if (action === 'pause') {
            window.speechSynthesis.pause();
            readerStatus('Lectura pausada.');
            return;
        }
        if (action === 'resume') {
            window.speechSynthesis.resume();
            readerStatus('Lectura reanudada.');
            return;
        }
        stopReading();
        const text = dialog?.querySelector('#legal-document-text')?.innerText?.trim();
        if (!text) return;
        const speech = new SpeechSynthesisUtterance(text);
        speech.lang = 'es-419';
        speech.onend = () => readerStatus('La lectura terminó.');
        speech.onerror = () => readerStatus('No se pudo completar la lectura en este navegador.');
        window.speechSynthesis.speak(speech);
        readerStatus(`Leyendo: ${currentDocument.title}.`);
    }

    function openLegalViewer() {
        // Los documentos tienen su propia vista. Esto evita que el contenido se
        // mezcle con la página y, en teléfono, el navegador la abre en otra pestaña.
        const legalTab = window.open('politicas.html', '_blank');
        if (!legalTab) window.location.href = 'politicas.html';
    }

    function closeLegalViewer() {
        if (!dialog) return;
        stopReading();
        dialog.classList.remove('is-open');
        document.documentElement.classList.remove('legal-open');
        lastFocused?.focus?.();
    }

    function bind() {
        document.querySelectorAll('[data-policies-open]').forEach((button) => button.addEventListener('click', openLegalViewer));
        syncDownloadVisibility();
        window.addEventListener('appinstalled', syncDownloadVisibility);
        window.addEventListener('beforeinstallprompt', (event) => {
            event.preventDefault();
            deferredInstallPrompt = event;
        });
        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && dialog?.classList.contains('is-open')) closeLegalViewer();
        });
    }

    window.abrirPoliticas = openLegalViewer;
    window.cerrarPoliticas = closeLegalViewer;
    window.ositoConsentimientoRegistroValido = function () {
        return Boolean(document.getElementById('auth-terms-consent')?.checked && document.getElementById('auth-privacy-consent')?.checked);
    };
    window.guardarConsentimientosRegistro = async function (user) {
        if (!user?.uid || !window.dbFirebase || !window.docFirebase || !window.setDocFirebase) {
            throw new Error('No se pudo guardar la aceptación de los documentos.');
        }
        const acceptedAt = Date.now();
        const version = DOCUMENT_VERSION.split(' — ')[0];
        const history = { version, acceptedAt, documents: ['terms', 'privacy'] };
        const payload = {
            legalConsents: {
                terms: { version, acceptedAt },
                privacy: { version, acceptedAt }
            },
            legalConsentUpdatedAt: acceptedAt
        };
        if (typeof window.arrayUnionFirebase === 'function') payload.legalConsentHistory = window.arrayUnionFirebase(history);
        await window.setDocFirebase(window.docFirebase(window.dbFirebase, 'users', user.uid), payload, { merge: true });
    };
    window.ositoMostrarInstalacion = async function () {
        if (!deferredInstallPrompt || isInstalled()) return false;
        deferredInstallPrompt.prompt();
        await deferredInstallPrompt.userChoice;
        deferredInstallPrompt = null;
        return true;
    };

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', bind, { once: true });
    else bind();
})();
