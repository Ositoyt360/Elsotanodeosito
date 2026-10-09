/* V98 — Teclado del celular: permitir MAYUSCULAS en los campos de texto.
 * Pone de forma explicita autocapitalize / autocorrect / spellcheck / inputmode en los campos
 * de escribir (chat en vivo, pregunta a la IA, nombre, etc.) y tambien en los que se creen despues.
 * No toca correo, contrasena, numeros, fechas, archivos ni colores.
 */
(function () {
  'use strict';
  var SALTAR = { password: 1, email: 1, url: 1, number: 1, tel: 1, file: 1, hidden: 1, color: 1, range: 1,
                 checkbox: 1, radio: 1, date: 1, 'datetime-local': 1, time: 1, month: 1, week: 1,
                 submit: 1, button: 1, reset: 1, image: 1 };

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

  function iniciar() {
    revisar(document);
    // Campos que se crean despues (paneles, formularios del moderador, etc.)
    try {
      new MutationObserver(function (cambios) {
        for (var i = 0; i < cambios.length; i++) {
          var nuevos = cambios[i].addedNodes;
          for (var j = 0; j < nuevos.length; j++) if (nuevos[j].nodeType === 1) revisar(nuevos[j]);
        }
      }).observe(document.documentElement, { childList: true, subtree: true });
    } catch (e) {}
    // Por si el teclado se abre antes de que se haya revisado el campo
    document.addEventListener('focusin', function (e) { arreglar(e.target); }, true);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', iniciar, { once: true });
  else iniciar();
}());
