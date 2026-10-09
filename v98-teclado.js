/* V98c (fix: ya no toca el texto mientras el teclado del celular esta componiendo la palabra) — V98b — MAYUSCULAS en los campos de escribir, con CUALQUIER teclado del celular.
 * 1) Atributos de teclado (autocapitalize, autocorrect, spellcheck, inputmode) en todos los campos de texto.
 * 2) Si el teclado no manda la mayuscula, la pagina la pone sola:
 *      - primera letra del mensaje y la que sigue a  . ! ?  (y despues de ¿ ¡)
 *      - boton ⇧ al lado del campo: 1 toque = la siguiente letra en MAYUSCULA,
 *        2 toques = BLOQUEO de mayusculas, 3er toque = apagado.
 *    Funciona en: chat en vivo, pregunta a la IA y nombre para la IA.
 */
(function () {
  'use strict';
  var SALTAR = { password: 1, email: 1, url: 1, number: 1, tel: 1, file: 1, hidden: 1, color: 1, range: 1,
                 checkbox: 1, radio: 1, date: 1, 'datetime-local': 1, time: 1, month: 1, week: 1,
                 submit: 1, button: 1, reset: 1, image: 1 };
  var CHAT_IDS = { 'livechat-input': 1, 'ai-input': 1, 'ai-name-input': 1 };
  var LETRA = /[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]/;
  var modo = 0; // 0 apagado, 1 una letra, 2 bloqueo
  var botones = [];

  function arreglar(el) {
    try {
      if (!el || el.__v98teclado) return;
      var tag = el.tagName;
      if (tag === 'INPUT') {
        var tipo = (el.getAttribute('type') || 'text').toLowerCase();
        if (SALTAR[tipo]) return;
      } else if (tag !== 'TEXTAREA') return;
      el.__v98teclado = true;
      el.setAttribute('autocapitalize', 'sentences');
      el.setAttribute('autocorrect', 'on');
      el.setAttribute('spellcheck', 'true');
      if (!el.getAttribute('inputmode')) el.setAttribute('inputmode', 'text');
      if (CHAT_IDS[el.id]) enganchar(el);
    } catch (e) {}
  }

  function revisar(raiz) {
    try {
      if (!raiz || !raiz.querySelectorAll) return;
      if (raiz.tagName === 'INPUT' || raiz.tagName === 'TEXTAREA') arreglar(raiz);
      var lista = raiz.querySelectorAll('input, textarea');
      for (var i = 0; i < lista.length; i++) arreglar(lista[i]);
    } catch (e) {}
  }

  /* ---------- boton ⇧ ---------- */
  function pintar() {
    botones.forEach(function (b) {
      b.setAttribute('data-modo', String(modo));
      b.setAttribute('aria-pressed', modo ? 'true' : 'false');
      b.textContent = modo === 2 ? '⇪' : '⇧';
      b.title = modo === 0 ? 'Mayúscula (1 toque: una letra · 2 toques: bloquear)'
              : modo === 1 ? 'Siguiente letra en MAYÚSCULA (toca otra vez para bloquear)'
              : 'Bloqueo de mayúsculas activado (toca para apagar)';
    });
  }

  function crearBoton(el) {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'v98-shift';
    b.setAttribute('aria-label', 'Mayúsculas');
    // no le quita el foco al campo: el teclado se queda abierto
    b.addEventListener('pointerdown', function (e) { e.preventDefault(); });
    b.addEventListener('mousedown', function (e) { e.preventDefault(); });
    b.addEventListener('click', function (e) {
      e.preventDefault();
      modo = (modo + 1) % 3;
      pintar();
      try { el.focus({ preventScroll: true }); } catch (x) {}
    });
    botones.push(b);
    return b;
  }

  function ponerBoton(el) {
    try {
      if (el.__v98btn) return;
      var b = crearBoton(el);
      el.__v98btn = b;
      if (el.id === 'ai-input') {
        var campo = el.closest('.ai-input-field');
        var cont = campo && campo.parentNode;
        if (cont) cont.insertBefore(b, campo);
        else el.parentNode.insertBefore(b, el);
      } else if (el.id === 'livechat-input') {
        var enviar = el.parentNode.querySelector('.btn-send-lc');
        el.parentNode.insertBefore(b, enviar || el.nextSibling);
      } else {
        el.parentNode.insertBefore(b, el.nextSibling);
      }
      pintar();
    } catch (e) {}
  }

  /* ---------- mayuscula automatica ---------- */
  function inicioDePalabra(v, pos) {
    var i = pos;
    while (i > 0 && LETRA.test(v.charAt(i - 1))) i--;
    return i;
  }
  function esInicioDeFrase(antes) {
    return /^[\s¿¡"'(]*$/.test(antes) || /[.!?…]["')]*\s+[¿¡"'(]*$/.test(antes) || /\n\s*[¿¡"'(]*$/.test(antes);
  }

  function procesar(el, tipo, posForzada) {
    try {
      if (tipo && tipo.indexOf('insert') !== 0) { // borrar, deshacer, etc.
        var p0 = el.selectionStart;
        if (p0 == null || inicioDePalabra(el.value, p0) === p0) el.__v98visto = -1;
        return;
      }
      var v = el.value, pos = (posForzada != null) ? posForzada : el.selectionStart;
      if (!v) { el.__v98visto = -1; return; }
      if (pos == null || pos < 1) return;
      var ini = inicioDePalabra(v, pos);
      if (ini === pos) { el.__v98visto = -1; return; }   // el caracter escrito no es letra
      var nueva = el.__v98visto !== ini;                  // primera vez que vemos esta palabra
      if (nueva) {
        el.__v98visto = ini;
        el.__v98cap = (modo > 0) || esInicioDeFrase(v.slice(0, ini));
        if (modo === 1) { modo = 0; pintar(); }           // "una letra" ya se uso
      }
      if (!el.__v98cap) return;
      var ch = v.charAt(ini), may = ch.toUpperCase();
      if (may !== ch && ch === ch.toLowerCase()) {
        var a = el.selectionStart, b = el.selectionEnd;
        el.value = v.slice(0, ini) + may + v.slice(ini + 1);
        try { el.setSelectionRange(a, b); } catch (x) {}
      }
    } catch (x) {}
  }

  function alEscribir(e) {
    var el = e.target;
    // Teclados de celular (Gboard, Samsung, etc.) escriben "componiendo" la palabra:
    // cambiar el texto en ese momento reinicia el teclado. Se espera a que la palabra termine.
    if (e.isComposing || (e.inputType && e.inputType.indexOf('Composition') > -1)) return;
    procesar(el, e.inputType);
  }

  function alTerminarComposicion(e) {
    var el = e.target;
    setTimeout(function () {
      // el teclado suele confirmar "palabra + espacio" junto: se mira la ultima palabra terminada
      var v = el.value, p = el.selectionStart;
      if (p == null) p = v.length;
      while (p > 0 && !LETRA.test(v.charAt(p - 1))) p--;
      if (p < 1) return;
      procesar(el, 'insertText', p);
    }, 0);
  }

  // Al enviar: la primera letra del mensaje siempre sale en mayuscula, aunque el teclado no haya ayudado.
  function alEnviar(e) {
    try {
      var form = e.target;
      if (!form || !form.querySelectorAll) return;
      var campos = form.querySelectorAll('input, textarea');
      for (var i = 0; i < campos.length; i++) {
        var c = campos[i];
        if (!CHAT_IDS[c.id] || !c.value) continue;
        var m = c.value.match(/^[\s¿¡"'(]*/)[0].length;
        var ch = c.value.charAt(m);
        if (ch && LETRA.test(ch) && ch === ch.toLowerCase()) {
          c.value = c.value.slice(0, m) + ch.toUpperCase() + c.value.slice(m + 1);
        }
      }
    } catch (x) {}
  }

  function enganchar(el) {
    ponerBoton(el);
    el.addEventListener('input', alEscribir);
    el.addEventListener('compositionend', alTerminarComposicion);
    el.addEventListener('blur', function () { el.__v98visto = -1; });
  }

  /* ---------- estilos del boton ---------- */
  function estilos() {
    if (document.getElementById('v98-shift-css')) return;
    var st = document.createElement('style');
    st.id = 'v98-shift-css';
    st.textContent =
      '.v98-shift{flex:0 0 auto;width:34px;height:34px;min-width:34px;padding:0;margin:0 2px;border-radius:50%;' +
      'border:1px solid rgba(0,242,254,.5);background:rgba(255,255,255,.08);color:#7df9ff;font:900 17px/1 system-ui,sans-serif;' +
      'display:inline-flex;align-items:center;justify-content:center;cursor:pointer;touch-action:manipulation;' +
      '-webkit-tap-highlight-color:transparent;user-select:none;position:relative;z-index:5}' +
      '.v98-shift[data-modo="1"]{background:linear-gradient(135deg,#00f2fe,#7c5cff);color:#06101c;border-color:#7df9ff}' +
      '.v98-shift[data-modo="2"]{background:linear-gradient(135deg,#58ff9a,#00f2fe);color:#06101c;border-color:#58ff9a}' +
      '@media (max-width:640px){html body #ai-section .ai-input-container>.v98-shift{transform:none!important;margin:0 1px!important;width:30px;height:30px;min-width:30px;font-size:15px}}';
    (document.head || document.documentElement).appendChild(st);
  }

  function iniciar() {
    estilos();
    revisar(document);
    try {
      new MutationObserver(function (cambios) {
        for (var i = 0; i < cambios.length; i++) {
          var nuevos = cambios[i].addedNodes;
          for (var j = 0; j < nuevos.length; j++) if (nuevos[j].nodeType === 1) revisar(nuevos[j]);
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    document.addEventListener('focusin', function (e) { arreglar(e.target); }, true);
    document.addEventListener('submit', alEnviar, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
}());
