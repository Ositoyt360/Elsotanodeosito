/* V73 — Mantenimiento con redirección, cuenta creadora exenta, "ver como usuario" y orbe de llamada. */
(function () {
  'use strict';
  var CREATOR_EMAIL = 'ositoyt360@elsotanodeosito.com';
  var KEY = 'osito_ver_como_usuario';
  var ss; try { ss = window.sessionStorage; } catch (e) { ss = null; }

  // ?vista=usuario activa la vista de usuario normal; ?vista=creador la desactiva.
  try {
    var q = new URLSearchParams(location.search).get('vista');
    if (ss && q === 'usuario') ss.setItem(KEY, '1');
    if (ss && q === 'creador') ss.removeItem(KEY);
  } catch (e) {}
  function viendoComoUsuario() { try { return ss && ss.getItem(KEY) === '1'; } catch (e) { return false; } }

  function esCreador(user) {
    if (!user || viendoComoUsuario()) return false;
    return String(user.email || '').trim().toLowerCase() === CREATOR_EMAIL ||
           String(user.displayName || '').trim().toLowerCase() === 'ositoyt360';
  }

  /* ---------- Autenticación (esperar al primer estado) ---------- */
  var authListo = false, usuario = null, enMant = null, esperando = [];
  function obtenerAuth() {
    try { if (window.firebaseAuth) return window.firebaseAuth; if (window.firebase && window.firebase.auth) return window.firebase.auth(); } catch (e) {}
    return null;
  }
  function iniciarAuth() {
    var a = obtenerAuth();
    if (!a) { setTimeout(iniciarAuth, 400); return; }
    a.onAuthStateChanged(function (u) { usuario = u; authListo = true; evaluar(); montarBotonVista(); });
  }

  /* ---------- Mantenimiento ---------- */
  function irA(url) { if (location.pathname.split('/').pop() !== url) location.replace(url); }
  function evaluar() {
    if (enMant === null || !authListo) return;
    document.body.classList.toggle('site-maintenance-active', enMant && !esCreador(usuario));
    var badge = document.getElementById('osito-mant-badge');
    if (enMant && esCreador(usuario)) {
      if (!badge) { badge = document.createElement('div'); badge.id = 'osito-mant-badge'; badge.textContent = '🛠️ Mantenimiento activo — solo tú ves el sitio'; document.body.appendChild(badge); }
    } else if (badge) badge.remove();
    if (enMant && !esCreador(usuario)) irA('mantenimiento.html');
  }
  window.OsitoMantenimiento = { aplicar: function (activo) { enMant = !!activo; evaluar(); }, esCreador: function () { return esCreador(usuario); } };

  /* ---------- Ver como usuario ---------- */
  function montarBotonVista() {
    var banner = document.getElementById('osito-vista-banner'), btn = document.getElementById('osito-vista-btn');
    if (viendoComoUsuario()) {
      if (btn) btn.remove();
      if (!banner && usuario) {
        banner = document.createElement('div'); banner.id = 'osito-vista-banner';
        banner.innerHTML = '<span>👁️ Estás viendo el sitio como lo ven los demás usuarios</span><button type="button">Salir de esta vista</button>';
        banner.querySelector('button').onclick = function () { try { ss.removeItem(KEY); } catch (e) {} location.reload(); };
        document.body.appendChild(banner);
        document.body.style.paddingTop = '38px';
      }
      return;
    }
    if (banner) { banner.remove(); document.body.style.paddingTop = ''; }
    var creador = usuario && String(usuario.email || '').toLowerCase() === CREATOR_EMAIL;
    if (creador && !btn) {
      btn = document.createElement('button'); btn.id = 'osito-vista-btn'; btn.type = 'button';
      btn.textContent = '👁️ Ver como usuario'; btn.title = 'Ver la página como la ven las demás cuentas';
      btn.onclick = function () { try { ss.setItem(KEY, '1'); } catch (e) {} location.reload(); };
      document.body.appendChild(btn);
    } else if (!creador && btn) btn.remove();
  }

  /* ---------- Orbe de la llamada: nivel suave mientras habla ---------- */
  function iniciarOrbe() {
    var av = document.getElementById('call-avatar'); if (!av) return;
    var raf = 0, nivel = 0, t0 = 0;
    function paso(t) {
      if (av.getAttribute('data-state') !== 'SPEAKING') { raf = 0; av.style.setProperty('--orb-lvl', '0'); return; }
      var s = t / 1000;
      var objetivo = Math.max(0, .5 + .28 * Math.sin(s * 9.1) + .2 * Math.sin(s * 5.3 + 1) + .12 * Math.sin(s * 14.7 + 2));
      nivel += (objetivo - nivel) * .25;
      av.style.setProperty('--orb-lvl', nivel.toFixed(3));
      raf = requestAnimationFrame(paso);
    }
    new MutationObserver(function () { if (av.getAttribute('data-state') === 'SPEAKING' && !raf) raf = requestAnimationFrame(paso); })
      .observe(av, { attributes: true, attributeFilter: ['data-state'] });
  }

  function arrancar() { iniciarAuth(); iniciarOrbe(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', arrancar); else arrancar();
})();
