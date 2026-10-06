/* V78 — "Ver como usuario" = sesión de INVITADO aislada (no usa ni toca tu cuenta).
 * - Se activa al abrir cualquier página con ?userPreview=1 y dura solo en esa pestaña (sessionStorage).
 * - Mientras está activo, Firebase usa una app aparte ("osito-guest") sin la sesión guardada de tu cuenta.
 * - "Salir de la vista" desactiva el modo y te lleva al index normal, ya con tu cuenta.
 */
(function () {
  'use strict';
  var KEY = 'osito_user_preview';
  var fresh = false, active = false;
  try {
    if (/[?&]userPreview=1(?:&|$)/.test(location.search)) {
      if (sessionStorage.getItem(KEY) !== '1') fresh = true;
      sessionStorage.setItem(KEY, '1');
    }
    active = sessionStorage.getItem(KEY) === '1';
  } catch (e) { active = /[?&]userPreview=1(?:&|$)/.test(location.search); }

  function exit() {
    try { sessionStorage.removeItem(KEY); } catch (e) {}
    location.replace('index.html');
  }

  // Devuelve { app, auth, db, storage } de la app de invitado (sin la sesión de tu cuenta).
  function services(config) {
    var fb = window.firebase;
    var app = fb.apps.filter(function (a) { return a.name === 'osito-guest'; })[0] || fb.initializeApp(config, 'osito-guest');
    var auth = app.auth();
    try { auth.setPersistence(fb.auth.Auth.Persistence.NONE).catch(function () {}); } catch (e) {}
    if (fresh) { try { auth.signOut().catch(function () {}); } catch (e) {} } // invitado limpio en cada vista nueva
    var storage = null;
    try { storage = app.storage(); } catch (e) {}
    return { app: app, auth: auth, db: app.firestore(), storage: storage };
  }

  function banner() {
    if (!active || document.getElementById('osito-guest-banner')) return;
    if (/(?:^|\/)mantenimiento\.html$/i.test(location.pathname)) return; // esa página trae su propia etiqueta
    var st = document.createElement('style');
    st.textContent = 'html body #osito-guest-banner{opacity:1!important;pointer-events:auto!important;visibility:visible!important;display:flex!important}#osito-guest-banner{position:fixed;z-index:2147483647;top:max(8px,env(safe-area-inset-top));left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:10px;padding:6px 8px 6px 14px;border-radius:999px;font:700 12px/1.2 Inter,system-ui,sans-serif;color:#fde68a;background:rgba(36,28,6,.92);border:1px solid rgba(250,204,21,.4);box-shadow:0 6px 24px rgba(0,0,0,.45);white-space:nowrap;max-width:94vw}#osito-guest-banner button{cursor:pointer;border:0;border-radius:999px;padding:6px 12px;font:800 12px Inter,system-ui,sans-serif;color:#1a1300;background:#facc15}#osito-guest-banner button:hover{filter:brightness(1.08)}@media(max-width:520px){#osito-guest-banner span{display:none}}';
    document.head.appendChild(st);
    var b = document.createElement('div');
    b.id = 'osito-guest-banner';
    b.innerHTML = '<span>👁️ Vista de usuario · sin tu cuenta</span><button type="button">Salir y volver a mi cuenta</button>';
    b.querySelector('button').addEventListener('click', exit);
    document.body.appendChild(b);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', banner, { once: true });
  else banner();

  window.OsitoGuest = { active: active, fresh: fresh, exit: exit, services: services };
}());
