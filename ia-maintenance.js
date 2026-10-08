/* V86 — MODO MANTENIMIENTO SOLO PARA LA IA.
 * - Se activa/desactiva desde el panel de moderación (siteSettings/public.iaMaintenance) y se ve en vivo.
 * - Afecta ÚNICAMENTE a la IA: en ia.html muestra la pantalla; en index.html solo aparece al intentar abrir la IA.
 *   El resto del sitio (chat en vivo, videos, cuenta, etc.) sigue funcionando normal.
 * - La mascota queda en el centro en PC, tablet y celular, con animación ligera (solo transform/opacity) que NO se apaga en celular.
 * - La cuenta creadora (OsitoYT360) no ve la pantalla. "Ver IA como usuario" (?userPreview=1) sí la ve.
 * - V89: se quitó el modo local / "IA beta". La IA vuelve a funcionar como antes; el mantenimiento solo muestra la pantalla.
 * No modifica nada más de la IA.
 */
(function () {
  'use strict';
  if (window.__ositoIaMaint) return;
  window.__ositoIaMaint = true;

  var CREATOR_EMAIL = 'ositoyt360@elsotanodeosito.com';
  var CACHE_KEY = 'osito_ia_maint';
  var ON_IA_PAGE = !!window.ositoEnIAPage || /(?:^|\/)ia\.html$/i.test(location.pathname);
  var preview = /[?&]userPreview=1(?:&|$)/.test(location.search) || !!(window.OsitoGuest && window.OsitoGuest.active);

  var flag = false;          // ¿mantenimiento de IA activo? (último valor conocido)
  var user = null;
  var authReady = preview;   // en vista previa no se espera ninguna sesión
  var authWaitExpired = false;
  var overlay = null;
  var wantOpen = true; // en index solo se muestra si la persona intenta abrir la IA

  try { flag = localStorage.getItem(CACHE_KEY) === '1'; } catch (e) {}

  function norm(v) { return String(v || '').trim().toLowerCase(); }
  function isCreator() { return !!user && (norm(user.email) === CREATOR_EMAIL || norm(user.displayName) === 'ositoyt360'); }
  function hasStoredSession() {
    try { return !preview && (localStorage.getItem('osito_session_hint') === '1' || !!localStorage.getItem('osito_user_profile')); } catch (e) { return false; }
  }

  /* ---------------------------------------------------------------- estilos */
  var CSS = [
    '.ia-maint-host{position:relative!important;min-height:clamp(430px,68vh,640px)}',
    '.ia-maint{position:absolute;inset:0;z-index:60;display:flex;align-items:center;justify-content:center;border-radius:inherit;',
    'padding:14px;',
    'box-sizing:border-box;overflow:auto;-webkit-overflow-scrolling:touch;overscroll-behavior:contain;',
    'background:radial-gradient(120% 90% at 50% 20%,#1b1448 0%,#0b0a22 55%,#04060e 100%);color:#eaf2ff;',
    'font-family:Inter,system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;animation:iaMFade .35s ease-out both}',
    '#ia-maint-overlay.ia-maint{position:absolute!important;inset:0!important;z-index:60!important;width:auto!important;height:auto!important;display:flex!important}',
    '.ia-maint .of-zzz,.ia-maint .of-spark,.ia-maint .of-bub{display:none!important}',
    '.ia-maint .maintenance-mascot .osito-face{--fs:clamp(90px,19vmin,150px)!important}',
    '.ia-maint *{box-sizing:border-box}',
    '.ia-maint-card{position:relative;width:min(560px,100%);margin:auto;display:flex;flex-direction:column;align-items:center;',
    'text-align:center;gap:clamp(8px,1.6vh,14px);padding:clamp(18px,4vh,34px) clamp(16px,4vw,30px);border-radius:28px;',
    'background:rgba(14,12,40,.72);border:1px solid rgba(0,242,254,.28);box-shadow:0 24px 70px rgba(0,0,0,.55),inset 0 0 40px rgba(124,92,255,.10)}',
    '.ia-maint-stage{position:relative;display:grid;place-items:center;width:clamp(150px,34vmin,250px);height:clamp(150px,34vmin,250px);margin:0 auto}',
    '.ia-maint-glow{position:absolute;inset:6%;border-radius:50%;background:radial-gradient(circle,rgba(0,242,254,.42),rgba(124,92,255,.22) 55%,transparent 72%);',
    'animation:iaMGlow 3.2s ease-in-out infinite;will-change:transform,opacity}',
    '.ia-maint-mascot{position:relative;z-index:2;display:grid;place-items:center;animation:iaMFloat 3.4s ease-in-out infinite;will-change:transform}',
    '.ia-maint .maintenance-mascot{display:grid;place-items:center;pointer-events:none}',
    '.ia-maint .maintenance-mascot .osito-face{width:clamp(110px,24vmin,180px)!important;height:clamp(110px,24vmin,180px)!important;margin:0 auto!important;position:relative!important;left:auto!important;top:auto!important;transform:none!important}',
    '.ia-maint .maintenance-mascot .of-card{border:0!important;outline:0!important;box-shadow:none!important;filter:none!important}',
    '.ia-maint .maintenance-mascot .of-card::before,.ia-maint .maintenance-mascot .of-card::after{display:none!important;box-shadow:none!important}',
    '.ia-maint .maintenance-mascot .of-d,.ia-maint .maintenance-mascot .of-cube-f{display:none!important;border:0!important;outline:0!important;box-shadow:none!important}',
    '.ia-maint .maintenance-mascot .of-blob{border:0!important;outline:0!important;box-shadow:none!important}',
    '.ia-maint-gear{position:absolute;z-index:3;font-size:clamp(20px,4.6vmin,34px);line-height:1;filter:drop-shadow(0 4px 8px rgba(0,0,0,.45));will-change:transform}',
    '.ia-maint-gear.g1{top:2%;right:4%;animation:iaMSpin 5s linear infinite}',
    '.ia-maint-gear.g2{bottom:6%;left:2%;font-size:clamp(16px,3.6vmin,26px);animation:iaMSpin 7s linear infinite reverse}',
    '.ia-maint-spark{position:absolute;z-index:1;width:6px;height:6px;border-radius:50%;background:#7df9ff;opacity:0;animation:iaMTwinkle 2.8s ease-in-out infinite}',
    '.ia-maint-spark.s1{top:14%;left:10%}.ia-maint-spark.s2{top:30%;right:0;animation-delay:.9s}.ia-maint-spark.s3{bottom:12%;right:16%;animation-delay:1.7s}',
    '.ia-maint h2{margin:0;font-size:clamp(1.25rem,4.2vw,1.9rem);line-height:1.15;font-weight:900;overflow-wrap:anywhere;',
    'background:linear-gradient(90deg,#7df9ff,#c4b5fd);-webkit-background-clip:text;background-clip:text;color:transparent}',
    '.ia-maint p{margin:0;font-size:clamp(.88rem,2.4vw,1rem);line-height:1.5;color:#c9d6f2;overflow-wrap:anywhere}',
    '.ia-maint-bar{position:relative;width:min(280px,80%);height:7px;border-radius:99px;background:rgba(255,255,255,.1);overflow:hidden;margin:2px 0}',
    '.ia-maint-bar::after{content:"";position:absolute;inset:0;width:45%;border-radius:99px;background:linear-gradient(90deg,#00f2fe,#7c5cff);animation:iaMBar 1.6s ease-in-out infinite;will-change:transform}',
    '.ia-maint-actions{display:flex;flex-wrap:wrap;gap:10px;justify-content:center;margin-top:10px}',
    '.ia-maint button{font:800 .92rem/1 Inter,system-ui,sans-serif;cursor:pointer;border:0;border-radius:999px;padding:12px 18px;min-height:44px;color:#06101c;',
    'background:linear-gradient(135deg,#00f2fe,#7df9ff);box-shadow:0 8px 22px rgba(0,242,254,.28);transition:transform .15s ease}',
    '.ia-maint button:active{transform:scale(.96)}',
    '.ia-maint button.sec{color:#eaf2ff;background:rgba(255,255,255,.1);box-shadow:none;border:1px solid rgba(255,255,255,.22)}',
    '@keyframes iaMFade{from{opacity:0}to{opacity:1}}',
    '@keyframes iaMFloat{0%,100%{transform:translate3d(0,0,0)}50%{transform:translate3d(0,-9px,0)}}',
    '@keyframes iaMGlow{0%,100%{transform:scale(.92);opacity:.65}50%{transform:scale(1.08);opacity:1}}',
    '@keyframes iaMSpin{to{transform:rotate(360deg)}}',
    '@keyframes iaMTwinkle{0%,100%{opacity:0;transform:scale(.4)}50%{opacity:.95;transform:scale(1.3)}}',
    '@keyframes iaMBar{0%{transform:translateX(-110%)}100%{transform:translateX(250%)}}',
    '@media (max-height:560px){.ia-maint-stage{width:clamp(100px,26vmin,150px);height:clamp(100px,26vmin,150px)}.ia-maint-card{padding:14px 16px;gap:6px}}',
    '@media (min-width:700px) and (max-width:1100px){.ia-maint-card{width:min(620px,86%)}}',
    /* V89: la animación de mantenimiento se mantiene SIEMPRE (también en celular, modo ahorro, "quitar animaciones" de Android
       o Modo Ultra): son solo transform/opacity, muy baratas. Se fuerza por encima de body.no-animations * y similares. */
    'html body #ia-maint-overlay .ia-maint-glow{animation:iaMGlow 3.2s ease-in-out infinite!important}',
    'html body #ia-maint-overlay .ia-maint-mascot{animation:iaMFloat 3.4s ease-in-out infinite!important}',
    'html body #ia-maint-overlay .ia-maint-gear.g1{animation:iaMSpin 5s linear infinite!important}',
    'html body #ia-maint-overlay .ia-maint-gear.g2{animation:iaMSpin 7s linear infinite reverse!important}',
    'html body #ia-maint-overlay .ia-maint-spark{animation:iaMTwinkle 2.8s ease-in-out infinite!important}',
    'html body #ia-maint-overlay .ia-maint-spark.s2{animation-delay:.9s!important}html body #ia-maint-overlay .ia-maint-spark.s3{animation-delay:1.7s!important}',
    'html body #ia-maint-overlay .ia-maint-bar::after{animation:iaMBar 1.6s ease-in-out infinite!important}',
    'html body #ia-maint-overlay .ia-maint-glow,html body #ia-maint-overlay .ia-maint-spark{display:block!important}',
    '.ia-maint-host>.ia-maint{pointer-events:auto}'
  ].join('');

  function injectStyle() {
    if (document.getElementById('ia-maint-style')) return;
    var st = document.createElement('style');
    st.id = 'ia-maint-style';
    st.textContent = CSS;
    (document.head || document.documentElement).appendChild(st);
  }

  /* ---------------------------------------------------------------- mascota */
  function mascotMarkup() {
    // Se reutiliza la mascota ya presente en la página (misma cara que usa el resto del sitio).
    var src = document.querySelector('#maintenance-overlay .osito-face') || document.querySelector('.ia-m-mascot .osito-face');
    if (src) {
      var clone = src.cloneNode(true);
      clone.removeAttribute('id');
      clone.setAttribute('data-estado', 'idle');
      clone.removeAttribute('data-expr');
      clone.removeAttribute('data-fase');
      clone.removeAttribute('data-leave');
      clone.setAttribute('aria-hidden', 'true');
      var tmp = document.createElement('div');
      tmp.appendChild(clone);
      return tmp.innerHTML;
    }
    var smile = '<svg fill="none" viewBox="0 0 24 24"><path fill="currentColor" d="M8.28386 16.2843C8.9917 15.7665 9.8765 14.731 12 14.731C14.1235 14.731 15.0083 15.7665 15.7161 16.2843C17.8397 17.8376 18.7542 16.4845 18.9014 15.7665C19.4323 13.1777 17.6627 11.1066 17.3088 10.5888C16.3844 9.23666 14.1235 8 12 8C9.87648 8 7.61556 9.23666 6.69122 10.5888C6.33728 11.1066 4.56771 13.1777 5.09858 15.7665C5.24582 16.4845 6.16034 17.8376 8.28386 16.2843Z"></path></svg>';
    return '<span class="osito-face" data-estado="idle" aria-hidden="true"><span class="of-card"><span class="of-blob"></span>' +
      '<span class="of-eyes"><span class="of-look"><i class="of-eye"></i><i class="of-eye"></i></span></span>' +
      '<span class="of-happy">' + smile + smile + '</span><span class="of-mouth"></span></span></span>';
  }

  /* ---------------------------------------------------------------- pantalla */
  function build() {
    injectStyle();
    var el = document.createElement('section');
    el.id = 'ia-maint-overlay';
    el.className = 'ia-maint';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.setAttribute('aria-label', 'La IA está en mantenimiento');
    el.innerHTML =
      '<div class="ia-maint-card">' +
        '<div class="ia-maint-stage">' +
          '<span class="ia-maint-glow"></span>' +
          '<span class="ia-maint-spark s1"></span><span class="ia-maint-spark s2"></span><span class="ia-maint-spark s3"></span>' +
          '<div class="ia-maint-mascot"><div class="maintenance-mascot" aria-hidden="true">' + mascotMarkup() + '</div></div>' +
          '<span class="ia-maint-gear g1" aria-hidden="true">⚙️</span><span class="ia-maint-gear g2" aria-hidden="true">⚙️</span>' +
        '</div>' +
        '<h2>La IA está en mantenimiento</h2>' +
        '<p>Estamos mejorando a la Mascotita del Sótano. Vuelve en un ratito. 🛠️</p>' +
        '<div class="ia-maint-bar" aria-hidden="true"></div>' +
        '<div class="ia-maint-actions">' +
          '<button type="button" id="ia-maint-back-btn">' + (ON_IA_PAGE ? '↩ Volver al Sótano' : '✕ Cerrar') + '</button>' +
        '</div>' +
      '</div>';
    el.querySelector('#ia-maint-back-btn').addEventListener('click', onBack);
    return el;
  }

  function show() {
    if (overlay) return;
    var host = document.getElementById('ai-section'); // solo cubre la zona de la IA, nunca toda la pantalla
    if (!host) return;
    overlay = build();
    host.classList.add('ia-maint-host');
    host.appendChild(overlay);
  }

  function hide() {
    if (!overlay) return;
    var host = overlay.parentNode;
    overlay.remove();
    overlay = null;
    if (host && host.classList) host.classList.remove('ia-maint-host');
  }

  function onBack() {
    if (ON_IA_PAGE) {
      if (typeof window.regresarAlSotano === 'function') window.regresarAlSotano();
      else location.href = 'index.html';
    } else {
      // En el index: cierra el panel de la IA (el resto del sitio queda a la vista).
      var panel = document.getElementById('ai-section');
      if (panel && panel.classList.contains('active') && typeof window.toggleIAPanel === 'function') window.toggleIAPanel();
    }
  }

  /* ---------------------------------------------------------------- decisión */
  function evaluate() {
    var needAuth = !authReady && !authWaitExpired && hasStoredSession();
    if (!flag || isCreator() || !wantOpen) { hide(); return; }
    if (needAuth) return; // espera a Firebase para no mostrarle la pantalla a la cuenta creadora
    show();
  }

  function applyFlag(value) {
    flag = !!value;
    try { localStorage.setItem(CACHE_KEY, flag ? '1' : '0'); } catch (e) {}
    evaluate();
  }

  function connect() {
    var tries = 0;
    (function wait() {
      var db = window.dbFirebase;
      if (!db || !db.doc) {
        if (++tries < 200) return setTimeout(wait, 50);
        return;
      }
      try {
        var auth = window.firebaseAuth;
        if (auth && auth.onAuthStateChanged && !preview) {
          auth.onAuthStateChanged(function (u) { user = u || null; authReady = true; evaluate(); });
        }
        db.doc('siteSettings/public').onSnapshot(function (snap) {
          var d = snap && snap.exists ? (snap.data() || {}) : {};
          applyFlag(d.iaMaintenance === true);
        }, function () { /* sin conexión: se conserva el último estado conocido */ });
      } catch (e) {}
    })();
    setTimeout(function () { authWaitExpired = true; evaluate(); }, 3500);
  }

  /* En index.html: abrir la IA mientras está en mantenimiento muestra la pantalla (no se abre la IA). */
  function wrapIndexEntry() {
    if (ON_IA_PAGE) return;
    var orig = window.toggleIAPanel;
    if (typeof orig !== 'function' || orig.__iaMaintWrapped) return;
    var wrapped = function () {
      if (flag && !isCreator()) { wantOpen = true; evaluate(); return; }
      return orig.apply(this, arguments);
    };
    wrapped.__iaMaintWrapped = true;
    window.toggleIAPanel = wrapped;
  }

  function start() {
    injectStyle();
    connect();
    evaluate();
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();

  window.OsitoIaMaintenance = { isActive: function () { return flag; }, show: function () { wantOpen = true; evaluate(); }, hide: hide };
}());
