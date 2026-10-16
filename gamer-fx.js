/* V99.9: con 'reducir movimiento' del sistema (Android lo activa con ahorro de bateria / animaciones apagadas) el fondo ya NO se congela: se mueve lento y suave.
 * V99.8: fondo visible en modo normal aunque Firebase tarde, en equipos de gama baja o con animaciones del sistema desactivadas.
 * ===================================================================== */
/* =====================================================================
 * V99.6 — Fondo gamer 3D de PARTÍCULAS para el modo normal (sin cuadrícula).
 *  - Campo de partículas en 3D con perspectiva: vuelas hacia adelante entre luces
 *    de neón, con giro suave y estelas cortas.
 *  - Optimizado para gama baja: sprites pre-dibujados (sin gradientes por cuadro),
 *    pocas partículas, resolución baja y límite de cuadros por segundo.
 *  - Solo corre con body.modo-normal. Se pausa en pestaña oculta, sin animaciones,
 *    modo ultra o "reducir movimiento".
 * ===================================================================== */
(function () {
    'use strict';
    var COLORS = [[57, 255, 106], [0, 242, 254], [140, 90, 255], [88, 255, 154]];
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var lowEnd = document.documentElement.classList.contains('low-end-device') ||
        (navigator.hardwareConcurrency && navigator.hardwareConcurrency <= 4) ||
        (navigator.deviceMemory && navigator.deviceMemory <= 4);
    var FPS = reduce ? 24 : (lowEnd ? 30 : 50), STEP = 1000 / FPS - 2;
    var NEAR = 0.15, FAR = 1.0;

    function rnd(a, b) { return a + Math.random() * (b - a); }

    // Sprites de brillo pre-dibujados (uno por color): drawImage es muy barato
    var sprites = [];
    function buildSprites() {
        if (sprites.length) return;
        for (var i = 0; i < COLORS.length; i++) {
            var c = document.createElement('canvas'); c.width = c.height = 64;
            var x = c.getContext('2d'), col = COLORS[i].join(',');
            var g = x.createRadialGradient(32, 32, 0, 32, 32, 32);
            g.addColorStop(0, 'rgba(255,255,255,1)');
            g.addColorStop(.18, 'rgba(' + col + ',.95)');
            g.addColorStop(.5, 'rgba(' + col + ',.28)');
            g.addColorStop(1, 'rgba(' + col + ',0)');
            x.fillStyle = g; x.fillRect(0, 0, 64, 64);
            sprites.push(c);
        }
    }

    function Fx(canvas) {
        this.c = canvas; this.ctx = canvas.getContext('2d');
        this.w = 0; this.h = 0; this.dpr = 1; this.t = 0; this.parts = [];
        this.resize();
    }
    Fx.prototype.newPart = function (far) {
        return {
            x: rnd(-1, 1), y: rnd(-1, 1), z: far ? FAR : rnd(NEAR, FAR),
            ci: (Math.random() * COLORS.length) | 0, s: rnd(.6, 1.5), px: 0, py: 0, has: false
        };
    };
    Fx.prototype.resize = function () {
        var r = this.c.getBoundingClientRect();
        this.dpr = lowEnd ? 1 : Math.min(window.devicePixelRatio || 1, 1.25);
        this.w = Math.max(1, r.width); this.h = Math.max(1, r.height);
        this.c.width = Math.round(this.w * this.dpr); this.c.height = Math.round(this.h * this.dpr);
        this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
        var n = Math.round(Math.min(240, Math.max(70, this.w * this.h / 5200)) * (lowEnd ? .5 : 1));
        this.parts = [];
        for (var i = 0; i < n; i++) this.parts.push(this.newPart(false));
    };
    Fx.prototype.frame = function (dt) {
        var ctx = this.ctx, w = this.w, h = this.h, cx = w / 2, cy = h / 2;
        var f = Math.max(w, h) * .62;
        var speed = reduce ? .03 : .055, ang = Math.sin(this.t * .1) * .04 * dt; // V99.9b: avance y giro MUY lentos (antes mareaba)
        var ca = Math.cos(ang), sa = Math.sin(ang);
        this.t += dt;
        ctx.clearRect(0, 0, w, h);
        ctx.globalCompositeOperation = 'lighter';
        for (var i = 0; i < this.parts.length; i++) {
            var p = this.parts[i];
            var ox = p.px, oy = p.py, had = p.has;
            p.z -= speed * dt * p.s;
            var nx = p.x * ca - p.y * sa; p.y = p.x * sa + p.y * ca; p.x = nx;
            if (p.z <= NEAR) { this.parts[i] = this.newPart(true); continue; }
            var sx = cx + p.x / p.z * f * .5, sy = cy + p.y / p.z * f * .5;
            if (sx < -40 || sx > w + 40 || sy < -40 || sy > h + 40) { this.parts[i] = this.newPart(true); continue; }
            var k = 1 - (p.z - NEAR) / (FAR - NEAR);          // 0 lejos … 1 cerca
            var size = 12 + k * k * (lowEnd ? 70 : 105);
            var alpha = Math.min(1, k * 2.8 + .35) * Math.min(1, (p.z - NEAR) * 14);
            ctx.globalAlpha = alpha;
            if (had && k > .15) { // estela de profundidad
                ctx.strokeStyle = 'rgba(' + COLORS[p.ci].join(',') + ',' + (alpha * .75).toFixed(2) + ')';
                ctx.lineWidth = 1.2 + k * 2.4;
                ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(sx, sy); ctx.stroke();
            }
            ctx.drawImage(sprites[p.ci], sx - size / 2, sy - size / 2, size, size);
            if (k > .5) { var s2 = size * .45; ctx.drawImage(sprites[p.ci], sx - s2 / 2, sy - s2 / 2, s2, s2); }
            p.px = sx; p.py = sy; p.has = true;
        }
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
    };

    var fxs = [], last = 0, running = false, acc = 0;

    var OTROS_TEMAS = /\bmodo-(halloween|navidad|san-valentin|cumpleanos)\b/;

    // V99.8: si todavía no se cargó el tema (Firebase tarda o falla) se asume modo normal.
    function ensureNormalClass() {
        var b = document.body;
        if (b && !/\bmodo-/.test(b.className)) b.classList.add('modo-normal');
    }

    // Solo se apaga por: otro tema, modo ultra, o "Quitar animaciones" elegido por el usuario.
    // OJO: 'no-animations' solo NO cuenta (el sitio lo pone solo en equipos de 2 núcleos / 2 GB).
    function active() {
        var b = document.body;
        if (!b || document.hidden) return false;
        if (OTROS_TEMAS.test(b.className)) return false;
        if (b.classList.contains('ultra-performance') || b.classList.contains('anim-off-usuario')) return false;
        return true;
    }

    // Con "reducir movimiento" del sistema se dibuja un cuadro fijo (se ve, pero sin moverse).
    function drawStatic() {
        fxs.forEach(function (f) { if (f.c.clientWidth && f.c.clientHeight) f.frame(0.0001); });
    }

    function make(parent, cls) {
        var c = document.createElement('canvas');
        c.className = cls; c.setAttribute('aria-hidden', 'true');
        parent.insertBefore(c, parent.firstChild);
        var f = new Fx(c);
        fxs.push(f);
        return f;
    }

    function ensure() {
        if (!document.body) return;
        ensureNormalClass();
        buildSprites();
        if (!document.getElementById('gamer-fx-bg')) { var f = make(document.body, 'gamer-fx-canvas'); f.c.id = 'gamer-fx-bg'; }
        var ws = document.getElementById('welcome-screen');
        if (ws && !ws.querySelector('.gamer-fx-welcome')) make(ws, 'gamer-fx-canvas gamer-fx-welcome');
    }

    function loop(ts) {
        if (!active()) { running = false; fxs.forEach(function (f) { f.ctx.clearRect(0, 0, f.w, f.h); }); return; }
        requestAnimationFrame(loop);
        var el = ts - last;
        if (el < STEP) return;           // límite de FPS (ahorra batería y CPU en gama baja)
        last = ts;
        var dt = Math.min(.06, el / 1000);
        for (var i = 0; i < fxs.length; i++) {
            var f = fxs[i];
            if (!f.c.clientWidth || !f.c.clientHeight) continue; // oculto (p. ej. bienvenida ya cerrada)
            f.frame(dt);
        }
    }

    function start() {
        ensure();
        if (!active()) return;
        if (running) return;
        running = true; last = performance.now();
        requestAnimationFrame(loop);
    }

    function init() {
        ensure();
        start();
        window.addEventListener('resize', function () { fxs.forEach(function (f) { f.resize(); }); });
        document.addEventListener('visibilitychange', start);
        if (window.MutationObserver) {
            new MutationObserver(function () { ensure(); start(); }).observe(document.body, { attributes: true, attributeFilter: ['class'] });
        }
        setInterval(function () { ensure(); fxs.forEach(function (f) { var r = f.c.getBoundingClientRect(); if (Math.abs(r.width - f.w) > 2 || Math.abs(r.height - f.h) > 2) { if (r.width > 0) f.resize(); } }); start(); }, 2500);
    }

    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
}());
