/* V99.3 — "Descargar app" (solo móvil Android): en la página principal y en el menú, también en modo invitado.
 * Ya NO aparece en la pantalla de entrada. Se oculta dentro de la propia app. */
(function () {
    'use strict';
    var APK = 'https://www.mediafire.com/file/cibf9kb55bh52wp/El_Sotano_De_Osito.apk/file';
    function enApp() {
        var ua = navigator.userAgent || '';
        return /; wv\)/.test(ua) || !!window.Capacitor || 
            (window.matchMedia && matchMedia('(display-mode: standalone)').matches);
    }
    function link(cls, html) {
        var a = document.createElement('a');
        a.className = cls; a.href = APK; a.target = '_blank'; a.rel = 'noopener noreferrer'; a.setAttribute('data-apk-link', '1');
        a.innerHTML = html; return a;
    }
    function montar() {
        if (enApp()) return;
        var dd = document.getElementById('header-menu-dropdown');
        if (dd && !dd.querySelector('[data-apk-link]')) {
            dd.insertBefore(link('btn-action btn-legal-menu', '<span aria-hidden="true">📲</span><span>Descargar app (solo móvil)</span>'), dd.querySelector('#mobile-menu-back') || null);
        }
        var ft = document.querySelector('main footer');
        if (ft && !document.querySelector('.app-movil-card')) {
            var c = document.createElement('div');
            c.className = 'app-movil-card';
            c.innerHTML = '<div class="amc-text"><strong>📱 App para móvil</strong>Instala El Sótano de Osito en tu celular Android.<br><small>Disponible solo para móvil (Android).</small></div>';
            c.appendChild(link('btn-descargar-app', '<span class="bda-ic">📲</span><span>Descargar app</span>'));
            ft.parentNode.insertBefore(c, ft);
        }
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', montar); else montar();
    setInterval(montar, 2000);
}());
