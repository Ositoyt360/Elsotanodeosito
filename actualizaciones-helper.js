// ========================================
// SISTEMA DE AUTO-ACTUALIZACIÓN EN TIEMPO REAL (WEB + APK ANDROID OTA DESDE GITHUB)
// ========================================
// Detecta automáticamente cambios en el repositorio GitHub (Ositoyt360/Elsotanodeosito)
// y en el servidor (/api/version). Cuando los archivos del repositorio se actualizan,
// el APK y la Web descargan y aplican los nuevos estilos, scripts y recursos
// automáticamente sin necesidad de reinstalar el APK ni borrar datos.

(function () {
    'use strict';
    if (window.__ositoAutoUpdateInit) return;
    window.__ositoAutoUpdateInit = true;

    var GITHUB_REPO = 'Ositoyt360/Elsotanodeosito';
    var GITHUB_API_COMMITS = 'https://api.github.com/repos/' + GITHUB_REPO + '/commits?per_page=1';
    var GITHUB_RAW_BASE = 'https://raw.githubusercontent.com/' + GITHUB_REPO + '/';

    var CHECK_INTERVAL_SERVER_MS = 25 * 1000; // Cada 25s en servidor local/producción
    var CHECK_INTERVAL_GITHUB_MS = 45 * 1000; // Cada 45s directo a GitHub API para APK/Web
    var INITIAL_DELAY_MS = 3500;

    var STORAGE_VERSION_KEY = 'osito_app_build_version';
    var STORAGE_GITHUB_SHA_KEY = 'osito_github_commit_sha';
    var STORAGE_OTA_CSS_KEY = 'osito_apk_ota_css_v1';

    var currentVersion = null;
    var currentGithubSha = null;
    var checkTimer = null;
    var githubTimer = null;
    var isChecking = false;
    var isReloading = false;

    try {
        currentVersion = localStorage.getItem(STORAGE_VERSION_KEY) || null;
        currentGithubSha = localStorage.getItem(STORAGE_GITHUB_SHA_KEY) || null;
    } catch (_) {}

    function isApkEnvironment() {
        var proto = window.location.protocol || '';
        var host = window.location.hostname || '';
        var ua = navigator.userAgent || '';
        return (
            proto === 'file:' ||
            proto === 'capacitor:' ||
            proto === 'app:' ||
            (host === 'localhost' && /wv|Android.*Version\/[0-9]/i.test(ua)) ||
            !!window.Capacitor ||
            window.matchMedia('(display-mode: standalone)').matches
        );
    }

    function isUserBusy() {
        try {
            var active = document.activeElement;
            if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA' || active.isContentEditable)) {
                return true;
            }
            var openModals = document.querySelectorAll('.modal.active, .auth-modal[style*="flex"], .osito-modal-open');
            if (openModals && openModals.length > 0) return true;
        } catch (_) {}
        return false;
    }

    // Si estamos en el APK y hay CSS OTA guardado del último commit de GitHub, aplicarlo al instante al arrancar
    function applyCachedOtaStylesOnBoot() {
        try {
            var raw = localStorage.getItem(STORAGE_OTA_CSS_KEY);
            if (!raw) return;
            var data = JSON.parse(raw);
            if (!data || !data.sha || !data.styles) return;
            Object.keys(data.styles).forEach(function (fileName) {
                var cssText = data.styles[fileName];
                if (!cssText) return;
                var styleId = 'osito-ota-css-' + fileName.replace(/[^a-z0-9]/gi, '-');
                var el = document.getElementById(styleId);
                if (!el) {
                    el = document.createElement('style');
                    el.id = styleId;
                    el.setAttribute('data-ota-sha', data.sha);
                    (document.head || document.documentElement).appendChild(el);
                }
                el.textContent = cssText;
            });
        } catch (_) {}
    }

    if (isApkEnvironment()) {
        applyCachedOtaStylesOnBoot();
    }

    // Descarga y aplica en vivo los archivos CSS y JS actualizados directamente desde GitHub Raw para el APK
    async function syncFromGithubRaw(sha) {
        if (!sha) return false;
        var cssFiles = ['styles.css', 'v49.css', 'v61.css', 'osito-cara3d.css', 'osito-actividades-3d.css'];
        var jsFiles = ['performance-lite.js', 'v49.js', 'osito-cara3d.js', 'firebase-integration.js'];
        var updatedCssMap = {};
        var anyUpdated = false;

        // 1. Avisar al Service Worker para que actualice su caché completa desde GitHub
        try {
            if ('serviceWorker' in navigator && navigator.serviceWorker.controller) {
                navigator.serviceWorker.controller.postMessage({
                    type: 'GITHUB_OTA_SYNC',
                    sha: sha
                });
            }
        } catch (_) {}

        // 2. Descargar y aplicar CSS en vivo sin parpadeos
        await Promise.all(cssFiles.map(async function (file) {
            try {
                var res = await fetch(GITHUB_RAW_BASE + sha + '/' + file + '?t=' + Date.now(), { cache: 'no-store' });
                if (!res.ok) return;
                var cssText = await res.text();
                if (!cssText || cssText.length < 20) return;
                updatedCssMap[file] = cssText;
                anyUpdated = true;

                var styleId = 'osito-ota-css-' + file.replace(/[^a-z0-9]/gi, '-');
                var el = document.getElementById(styleId);
                if (!el) {
                    el = document.createElement('style');
                    el.id = styleId;
                    (document.head || document.documentElement).appendChild(el);
                }
                el.setAttribute('data-ota-sha', sha);
                el.textContent = cssText;
            } catch (_) {}
        }));

        try {
            if (Object.keys(updatedCssMap).length > 0) {
                localStorage.setItem(STORAGE_OTA_CSS_KEY, JSON.stringify({
                    sha: sha,
                    ts: Date.now(),
                    styles: updatedCssMap
                }));
            }
        } catch (_) {}

        // 3. Si estamos en APK o standalone, recargar scripts ligeros en caliente
        if (isApkEnvironment()) {
            await Promise.all(jsFiles.map(async function (file) {
                try {
                    var res = await fetch(GITHUB_RAW_BASE + sha + '/' + file + '?t=' + Date.now(), { cache: 'no-store' });
                    if (!res.ok) return;
                    var jsText = await res.text();
                    if (!jsText || jsText.length < 20) return;
                    anyUpdated = true;
                    // Para scripts de optimización/UI seguros de re-ejecutar
                    if (file === 'performance-lite.js' || file === 'v49.js') {
                        var s = document.createElement('script');
                        s.setAttribute('data-ota-script', file);
                        s.textContent = jsText;
                        (document.body || document.head || document.documentElement).appendChild(s);
                    }
                } catch (_) {}
            }));
        }

        return anyUpdated;
    }

    function refreshStylesheetsInPlace(newVer) {
        try {
            var links = document.querySelectorAll('link[rel="stylesheet"]');
            var stamp = encodeURIComponent(newVer || Date.now());
            links.forEach(function (link) {
                var href = link.getAttribute('href');
                if (!href || /^https?:\/\//i.test(href)) return;
                var base = href.split('?')[0];
                link.setAttribute('href', base + '?v=' + stamp);
            });
        } catch (_) {}
    }

    async function clearAppCaches() {
        try {
            if ('caches' in window) {
                var keys = await caches.keys();
                await Promise.all(keys.map(function (k) { return caches.delete(k); }));
            }
        } catch (_) {}
        try {
            if ('serviceWorker' in navigator) {
                var regs = await navigator.serviceWorker.getRegistrations();
                await Promise.all(regs.map(function (r) { return r.update(); }));
            }
        } catch (_) {}
    }

    async function applySeamlessUpdate(newVer, source) {
        if (isReloading) return;
        try {
            localStorage.setItem(STORAGE_VERSION_KEY, newVer);
        } catch (_) {}

        refreshStylesheetsInPlace(newVer);

        if (isUserBusy()) {
            var retry = setInterval(function () {
                if (!isUserBusy()) {
                    clearInterval(retry);
                    triggerCleanReload(newVer, source);
                }
            }, 4000);
            return;
        }
        await triggerCleanReload(newVer, source);
    }

    async function triggerCleanReload(newVer, source) {
        if (isReloading) return;
        isReloading = true;

        // Si estamos en el APK y se actualizó por GitHub OTA, sincronizar en caliente sin romper la vista
        if (source === 'github' && isApkEnvironment()) {
            await syncFromGithubRaw(newVer);
            isReloading = false;
            return;
        }

        await clearAppCaches();
        setTimeout(function () {
            try {
                window.location.reload();
            } catch (_) {
                isReloading = false;
            }
        }, 400);
    }

    // 1) Verificación directa contra el repositorio de GitHub (funciona tanto en APK como en Web)
    async function checkGithubRepoVersion() {
        if (document.hidden) return;
        try {
            var res = await fetch(GITHUB_API_COMMITS, {
                method: 'GET',
                headers: { 'Accept': 'application/vnd.github.v3+json' },
                cache: 'no-store'
            });
            if (!res.ok) return;
            var commits = await res.json();
            if (!Array.isArray(commits) || !commits[0] || !commits[0].sha) return;

            var latestSha = String(commits[0].sha).trim();
            if (!currentGithubSha) {
                currentGithubSha = latestSha;
                try { localStorage.setItem(STORAGE_GITHUB_SHA_KEY, latestSha); } catch (_) {}
                // Si estamos en el APK, asegurar que tenemos los últimos recursos de GitHub sincronizados
                if (isApkEnvironment()) {
                    syncFromGithubRaw(latestSha);
                }
                return;
            }

            if (latestSha !== currentGithubSha) {
                currentGithubSha = latestSha;
                try { localStorage.setItem(STORAGE_GITHUB_SHA_KEY, latestSha); } catch (_) {}
                await syncFromGithubRaw(latestSha);
                if (!isApkEnvironment()) {
                    refreshStylesheetsInPlace(latestSha.slice(0, 8));
                }
            }
        } catch (_) {}
    }

    // 2) Verificación contra el servidor (/api/version)
    async function checkServerVersion() {
        if (isChecking || isReloading || document.hidden) return;
        if (window.location.protocol === 'file:') return;
        isChecking = true;
        try {
            var res = await fetch('/api/version?t=' + Date.now(), {
                cache: 'no-store',
                headers: { 'Cache-Control': 'no-cache', 'Pragma': 'no-cache' }
            });
            if (!res.ok) return;
            var data = await res.json();
            if (!data || !data.version) return;

            var serverVersion = String(data.version);
            if (!currentVersion) {
                currentVersion = serverVersion;
                try { localStorage.setItem(STORAGE_VERSION_KEY, currentVersion); } catch (_) {}
                return;
            }

            if (serverVersion !== currentVersion) {
                currentVersion = serverVersion;
                await applySeamlessUpdate(serverVersion, 'server');
            }
        } catch (_) {
        } finally {
            isChecking = false;
        }
    }

    function registerAutoServiceWorker() {
        if (!('serviceWorker' in navigator)) return;
        if (window.location.protocol === 'file:') return;
        window.addEventListener('load', function () {
            navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(function (reg) {
                reg.addEventListener('updatefound', function () {
                    var newWorker = reg.installing;
                    if (!newWorker) return;
                    newWorker.addEventListener('statechange', function () {
                        if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                            newWorker.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            }).catch(function () {});

            navigator.serviceWorker.addEventListener('message', function (event) {
                if (!event.data) return;
                if (event.data.type === 'GITHUB_OTA_READY' && event.data.sha) {
                    refreshStylesheetsInPlace(String(event.data.sha).slice(0, 8));
                }
            });
        });
    }

    function startMonitoring() {
        registerAutoServiceWorker();

        setTimeout(function () {
            checkServerVersion();
            checkGithubRepoVersion();
            checkTimer = setInterval(checkServerVersion, CHECK_INTERVAL_SERVER_MS);
            githubTimer = setInterval(checkGithubRepoVersion, CHECK_INTERVAL_GITHUB_MS);
        }, INITIAL_DELAY_MS);

        document.addEventListener('visibilitychange', function () {
            if (!document.hidden) {
                checkServerVersion();
                checkGithubRepoVersion();
            }
        });

        window.addEventListener('online', function () {
            checkServerVersion();
            checkGithubRepoVersion();
        });
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', startMonitoring);
    } else {
        startMonitoring();
    }

    // Exponer API manual por si se desea forzar sincronización con GitHub desde consola o APK
    window.ositoForzarActualizacionGithub = function () {
        currentGithubSha = null;
        return checkGithubRepoVersion();
    };
})();
