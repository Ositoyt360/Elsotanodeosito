/* ============================================================================
 * V64 — Motor Adaptativo de Hz (60Hz / 90Hz / 120Hz / 144Hz), Fluidez en Carga
 * y Multitarea en Segundo Plano para Teléfonos y Tabletas.
 *
 * 1) Detecta los Hz reales de la pantalla (60, 90, 120, 144 Hz) y sincroniza
 *    el presupuesto por cuadro (--device-hz, --frame-budget-ms) sin limitar FPS.
 * 2) Detector instantáneo de bajones de FPS: al primer síntoma de lentitud,
 *    activa .hz-fluid-boost en el acto para liberar GPU/CPU y recuperar fluidez.
 * 3) Modo Carga Fluida (.charging-fluid-mode): cuando el celular está cargando
 *    (o con batería baja), apaga repintados térmicos pesados (blur, sombras
 *    múltiples, malla O(N²) del canvas) para que vaya igual de fluido a 60/120Hz.
 * 4) Optimización con apps en segundo plano: libera memoria al cambiar de app
 *    y aplica impulso de fluidez instantáneo al regresar.
 * ============================================================================ */
(function () {
  'use strict';
  if (typeof window === 'undefined' || window.__OsitoAdaptiveHzLoaded) return;
  window.__OsitoAdaptiveHzLoaded = true;

  var root = document.documentElement;
  var nav = navigator;
  var conn = nav.connection || nav.mozConnection || nav.webkitConnection || null;
  var NativeRAF = (window.__ositoNativeRAF || window.requestAnimationFrame).bind(window);

  var isSmallPhone = window.innerWidth > 0 && window.innerWidth < 640;
  var mem = Number(nav.deviceMemory || 0);
  var cores = Number(nav.hardwareConcurrency || 0);
  var low = (mem > 0 && mem <= 2) || (cores > 0 && cores <= 2);
  var saver = !!(conn && conn.saveData) || !!(conn && /^(slow-2g|2g|3g)$/.test(conn.effectiveType || ''));
  var capture = false;
  var isCharging = false;
  var lowBattery = false;
  var detectedHz = 60;
  var frameBudgetMs = 16.67;
  var fluidBoostActive = false;
  var fluidBoostTimer = 0;

  if (low) root.classList.add('mobile-lite', 'low-end-device');
  else if (isSmallPhone && ((mem > 0 && mem <= 4) || (cores > 0 && cores <= 4))) root.classList.add('mobile-lite');
  if (saver) root.classList.add('data-saver');
  if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) root.classList.add('no-animations');

  /* ---------- 1) Impulso instantáneo de fluidez (.hz-fluid-boost) ---------- */
  function activarFluidBoost(duracionMs) {
    clearTimeout(fluidBoostTimer);
    if (!fluidBoostActive) {
      fluidBoostActive = true;
      root.classList.add('hz-fluid-boost');
      if (document.body) document.body.classList.add('hz-fluid-boost');
    }
    var mantener = isCharging || lowBattery || low;
    if (!mantener && duracionMs > 0) {
      fluidBoostTimer = setTimeout(function () {
        if (isCharging || lowBattery || low) return;
        fluidBoostActive = false;
        root.classList.remove('hz-fluid-boost');
        if (document.body) document.body.classList.remove('hz-fluid-boost');
      }, duracionMs);
    }
  }

  /* ---------- 2) Calibración automática de Hz (60 / 90 / 120 / 144 Hz) ---------- */
  function fijarHz(hz) {
    detectedHz = hz;
    frameBudgetMs = 1000 / hz;
    root.dataset.refreshHz = String(hz);
    root.style.setProperty('--device-hz', String(hz));
    root.style.setProperty('--frame-budget-ms', frameBudgetMs.toFixed(2) + 'ms');
    root.classList.toggle('high-refresh-hz', hz >= 90);
    root.classList.toggle('hz-120', hz >= 115);
    root.classList.toggle('hz-90', hz >= 85 && hz < 115);
    root.classList.toggle('hz-60', hz < 85);
  }
  fijarHz(60);

  function calibrarHzYMonitorearFluidez() {
    var muestras = [];
    var ultimoT = 0;
    var cuadrosLentosSeguidos = 0;
    var faseCalibracion = true;

    function ciclo(t) {
      if (document.hidden) {
        ultimoT = 0;
        NativeRAF(ciclo);
        return;
      }
      if (ultimoT > 0) {
        var delta = t - ultimoT;
        if (faseCalibracion && delta > 3 && delta < 40) {
          muestras.push(delta);
          if (muestras.length >= 24) {
            var ordenadas = muestras.slice().sort(function (a, b) { return a - b; });
            var p20 = ordenadas[Math.max(0, Math.floor(ordenadas.length * 0.2))];
            var fpsEst = 1000 / p20;
            var hz = 60;
            if (fpsEst >= 132) hz = 144;
            else if (fpsEst >= 105) hz = 120;
            else if (fpsEst >= 78) hz = 90;
            else hz = 60;
            fijarHz(hz);
            faseCalibracion = false;
          }
        }

        // Detector en tiempo real de lentitud: si el teléfono baja de ritmo
        // (por carga, calor o apps en segundo plano), activa fluidez al instante.
        var umbralLento = Math.max(22, frameBudgetMs * 1.75);
        if (delta > umbralLento && delta < 500) {
          cuadrosLentosSeguidos++;
          if (cuadrosLentosSeguidos >= 3) {
            activarFluidBoost(6000);
            cuadrosLentosSeguidos = 0;
          }
        } else if (cuadrosLentosSeguidos > 0) {
          cuadrosLentosSeguidos--;
        }
      }
      ultimoT = t;
      NativeRAF(ciclo);
    }

    NativeRAF(ciclo);

    // Re-calibrar Hz al cambiar orientación o volver de segundo plano
    window.addEventListener('Focus', function () { faseCalibracion = true; muestras.length = 0; }, { passive: true });
    window.addEventListener('resize', function () { faseCalibracion = true; muestras.length = 0; }, { passive: true });
  }

  calibrarHzYMonitorearFluidez();

  // Observador de tareas largas (Long Tasks > 50ms) por apps en segundo plano o GC
  try {
    if ('PerformanceObserver' in window) {
      var po = new PerformanceObserver(function (list) {
        var entries = list.getEntries();
        if (entries && entries.length > 0) {
          activarFluidBoost(5500);
        }
      });
      po.observe({ entryTypes: ['longtask'] });
    }
  } catch (e) {}

  /* ---------- 3) Modo Carga Fluida (cuando el teléfono está cargando) ---------- */
  function aplicarEstadoBateria(bat) {
    if (!bat) return;
    isCharging = Boolean(bat.charging);
    lowBattery = typeof bat.level === 'number' && bat.level <= 0.20;
    var modoCargaActivo = isCharging || lowBattery;

    root.classList.toggle('charging-fluid-mode', modoCargaActivo);
    if (document.body) document.body.classList.toggle('charging-fluid-mode', modoCargaActivo);

    if (modoCargaActivo) {
      activarFluidBoost(0);
      // Si hay video de fondo pesado, cambiar a la versión ligera para no calentar la GPU mientras carga
      try {
        var v = document.querySelector('#modo-sitio-video video');
        var tema = root.dataset.siteTheme || 'normal';
        if (v && /^(halloween|navidad|cumpleanos)$/.test(tema)) {
          var liteSrc = 'fondos/' + tema + '-lite.mp4';
          var actual = v.getAttribute('src') || '';
          if (actual && actual.indexOf('-lite.mp4') === -1) {
            v.src = liteSrc;
            v.load();
            var p = v.play();
            if (p && p.catch) p.catch(function () {});
          }
        }
      } catch (e) {}
    } else if (!low) {
      fluidBoostActive = false;
      root.classList.remove('hz-fluid-boost');
      if (document.body) document.body.classList.remove('hz-fluid-boost');
    }
  }

  try {
    if (typeof nav.getBattery === 'function') {
      nav.getBattery().then(function (bat) {
        aplicarEstadoBateria(bat);
        bat.addEventListener('chargingchange', function () { aplicarEstadoBateria(bat); });
        bat.addEventListener('levelchange', function () { aplicarEstadoBateria(bat); });
      }).catch(function () {});
    }
  } catch (e) {}

  /* ---------- 4) Optimización para Apps en Segundo Plano y Multitarea ---------- */
  function alOcultarApp() {
    root.classList.add('app-backgrounded');
    try {
      document.querySelectorAll('video').forEach(function (v) {
        if (!v.paused) v.pause();
      });
    } catch (e) {}
  }

  function alRegresarApp() {
    root.classList.remove('app-backgrounded');
    // Impulso inmediato de 3.5s al volver de otra aplicación en segundo plano
    activarFluidBoost(3500);
    if (window.OsitoV62 && typeof window.OsitoV62.aplicarVideo === 'function') {
      window.OsitoV62.aplicarVideo();
    }
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) alOcultarApp();
    else alRegresarApp();
  });
  window.addEventListener('pagehide', alOcultarApp, { passive: true });
  window.addEventListener('pageshow', alRegresarApp, { passive: true });
  window.addEventListener('blur', function () { activarFluidBoost(2500); }, { passive: true });
  window.addEventListener('focus', alRegresarApp, { passive: true });

  /* ---------- 5) Captura de pantalla / grabación ---------- */
  function captureOn() {
    if (capture) return;
    capture = true;
    root.classList.add('capture-performance', 'hz-fluid-boost');
    if (document.body) document.body.classList.add('capture-performance', 'hz-fluid-boost');
    try {
      document.querySelectorAll('video').forEach(function (v) {
        if (!v.closest('#modo-sitio-video')) return;
        v.pause();
      });
    } catch (e) {}
  }
  function captureOff() {
    capture = false;
    root.classList.remove('capture-performance');
    if (document.body) document.body.classList.remove('capture-performance');
  }
  try {
    if (nav.mediaDevices && nav.mediaDevices.getDisplayMedia) {
      var gd = nav.mediaDevices.getDisplayMedia.bind(nav.mediaDevices);
      nav.mediaDevices.getDisplayMedia = function () {
        return gd.apply(null, arguments).then(function (stream) {
          captureOn();
          stream.getTracks().forEach(function (track) {
            track.addEventListener('ended', function () { setTimeout(captureOff, 250); });
          });
          return stream;
        });
      };
    }
  } catch (e) {}
  try {
    var MR = window.MediaRecorder;
    if (MR) {
      window.MediaRecorder = function (stream, options) {
        captureOn();
        var r = new MR(stream, options);
        r.addEventListener('stop', function () { setTimeout(captureOff, 250); });
        return r;
      };
      window.MediaRecorder.prototype = MR.prototype;
    }
  } catch (e) {}

  /* ---------- 6) Imágenes e iframes asíncronos ---------- */
  function lazyImages() {
    document.querySelectorAll('img').forEach(function (img) {
      if (!img.loading) img.loading = 'lazy';
      if (!img.decoding) img.decoding = 'async';
    });
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', lazyImages, { once: true });
  else lazyImages();

  window.OsitoPerformance = {
    lowEnd: low,
    dataSaver: saver,
    getHz: function () { return detectedHz; },
    isCharging: function () { return isCharging; },
    isFluidBoost: function () { return fluidBoostActive; },
    boostNow: function (ms) { activarFluidBoost(ms || 5000); },
    capture: function (v) { if (v === false) captureOff(); else captureOn(); },
    isCapture: function () { return capture; }
  };
}());
