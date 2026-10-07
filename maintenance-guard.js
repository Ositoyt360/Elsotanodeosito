/* V77 — mantenimiento separado de la página principal.
 * - Visitantes: si mantenimiento está activo -> mantenimiento.html
 * - Cuenta OsitoYT360: nunca entra en mantenimiento normal.
 * - ?userPreview=1 (Ver como usuario): se comporta como un visitante SIN sesión.
 *   No carga Firebase Auth, no lee ni modifica la cuenta, solo lee siteSettings/public (lectura pública).
 *   Mantenimiento ON -> mantenimiento.html; OFF -> index.html como invitado (ver guest-mode.js).
 */
(function () {
  'use strict';

  var CREATOR_EMAIL = 'ositoyt360@elsotanodeosito.com';
  var CREATOR_NAMES = ['ositoyt360', 'osito yt360', 'el sotano de osito'];
  var MAINTENANCE_PAGE = 'mantenimiento.html';
  var HOME_PAGE = 'index.html';
  var params = new URLSearchParams(location.search);
  var userPreview = params.get('userPreview') === '1' || !!(window.OsitoGuest && window.OsitoGuest.active);
  var isMaintenancePage = /(?:^|\/)mantenimiento\.html$/i.test(location.pathname);
  // V87: "Ver IA como usuario" (?only=ia) solo prueba la pantalla de mantenimiento de la IA: no salta al mantenimiento global.
  var iaOnlyPreview = userPreview && params.get('only') === 'ia';
  var currentUser = null;
  var authReady = userPreview; // en vista previa no se espera ninguna sesión
  var lastActive = null;       // último estado recibido de Firestore (aunque auth aún no esté listo)
  var redirecting = false;

  var CONFIG = {
    apiKey: 'AIzaSyAM4rnHi3YU5pY6EK66ztAPRQdESs789Ew',
    authDomain: 'el-sotano-de-osito.firebaseapp.com',
    projectId: 'el-sotano-de-osito',
    storageBucket: 'el-sotano-de-osito.firebasestorage.app',
    messagingSenderId: '569093514370',
    appId: '1:569093514370:web:121b78008c667bde93409b'
  };

  function normalize(v) { return String(v || '').trim().toLowerCase().replace(/\s+/g, ' '); }

  function isCreator(user) {
    if (!user) return false;
    return normalize(user.email) === CREATOR_EMAIL || CREATOR_NAMES.indexOf(normalize(user.displayName)) !== -1;
  }

  function go(url) {
    if (redirecting) return;
    var file = url.split('?')[0];
    if (location.pathname.endsWith('/' + file) || location.pathname === file) return;
    redirecting = true;
    location.replace(url);
  }

  function setPreviewTag() {
    var tag = document.getElementById('preview-tag');
    if (tag) tag.hidden = false;
  }

  function apply(active) {
    lastActive = !!active;
    if (iaOnlyPreview && !isMaintenancePage) return;
    if (userPreview) {
      // Vista de usuario = invitado. Mantenimiento ON -> pantalla de mantenimiento.
      // Mantenimiento OFF -> página principal como invitado (sin tu cuenta).
      if (isMaintenancePage) setPreviewTag();
      if (lastActive) go(MAINTENANCE_PAGE);
      else if (isMaintenancePage) go(HOME_PAGE);
      return;
    }
    // Nunca decidimos si es el creador mientras Firebase aún restaura la sesión.
    // (V77: el estado se guarda en lastActive y se re-aplica cuando auth está listo.)
    if (!authReady) return;

    if (isMaintenancePage) {
      if (!lastActive || isCreator(currentUser)) go(HOME_PAGE);
      return;
    }
    if (lastActive && !isCreator(currentUser)) go(MAINTENANCE_PAGE);
  }

  function attachFirebase() {
    if (!window.firebase) return false;
    try {
      var app, db;
      if (userPreview) {
        // App con nombre propio y SIN módulo de autenticación: no puede heredar la sesión de la cuenta.
        var existing = window.firebase.apps.filter(function (a) { return a.name === 'osito-preview'; })[0];
        app = existing || window.firebase.initializeApp(CONFIG, 'osito-preview');
        db = app.firestore();
      } else {
        app = window.firebase.apps.length ? window.firebase.app() : window.firebase.initializeApp(CONFIG);
        db = window.firebase.firestore();
        var auth = window.firebase.auth();
        window.firebaseAuth = window.firebaseAuth || auth;
        window.dbFirebase = window.dbFirebase || db;
        auth.onAuthStateChanged(function (user) {
          currentUser = user || null;
          authReady = true;
          if (lastActive !== null) apply(lastActive); // FIX: antes se perdía el estado si Firestore llegaba primero
        });
      }

      var ref = db.doc('siteSettings/public');
      var handler = function (snap) {
        var data = snap.exists ? (snap.data() || {}) : {};
        apply(data.maintenance === true);
      };
      ref.get().then(handler).catch(function () { /* si Firestore no responde, no bloqueamos el sitio */ });
      ref.onSnapshot(handler, function () {});
      return true;
    } catch (e) {
      return false;
    }
  }

  function start() {
    if (userPreview && isMaintenancePage) setPreviewTag();
    if (attachFirebase()) return;
    setTimeout(start, 100);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start, { once: true });
  else start();
}());
