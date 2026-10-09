/* =====================================================================
 * Service Worker Oficial — El Sótano de Osito (PWA + APK Auto-Actualizable)
 * Estrategia:
 *  - Soporta OTA (Over-The-Air) directo desde GitHub (Ositoyt360/Elsotanodeosito):
 *    cuando hay un nuevo commit en el repositorio, descarga los archivos
 *    actualizados desde raw.githubusercontent.com y los sirve de inmediato
 *    tanto en la web como dentro del APK instalado.
 *  - HTML, JS, CSS, JSON: Network-First (con cache: 'no-store') + respaldo OTA
 *    de GitHub y copia offline en caché.
 *  - Activación inmediata con skipWaiting() y clients.claim().
 * ===================================================================== */

const CACHE_NAME = 'osito-pwa-v98c';
const OTA_CACHE_NAME = 'osito-ota-github-v90';
const GITHUB_REPO = 'Ositoyt360/Elsotanodeosito';
const OTA_ENABLED = false;

const CORE_ASSETS = [
  './',
  './index.html',
  './mantenimiento.html',
  './perfil.html',
  './ia.html',
  './ia-page.css',
  './chat-ia-core.js',
  './ia-openai.js',
  './call-mode-engine.js',
  './firebase-compat-init.js',
  './ia-maintenance.js',
  './moderador.html',
  './manifest.json',
  './styles.css',
  './v49.css',
  './v61.css',
  './v92.css',
  './v98-teclado.js',
  './actualizaciones-helper.js',
  './performance-lite.js',
  './base-conocimiento.js',
  './v49.js',
  './firebase-integration.js',
  './asistente-voz.js',
  './face-extra.js',
  './favicon.png',
  './favicon-48.png',
  './pwa-192x192.png',
  './pwa-512x512.png',
  './pwa-maskable-512x512.png',
  './apple-touch-icon.png',
  './icon.svg'
];

function getMimeType(filename) {
  if (/\.html$/i.test(filename)) return 'text/html; charset=utf-8';
  if (/\.css$/i.test(filename)) return 'text/css; charset=utf-8';
  if (/\.js$/i.test(filename)) return 'application/javascript; charset=utf-8';
  if (/\.json$/i.test(filename)) return 'application/json; charset=utf-8';
  if (/\.svg$/i.test(filename)) return 'image/svg+xml';
  if (/\.png$/i.test(filename)) return 'image/png';
  if (/\.jpe?g$/i.test(filename)) return 'image/jpeg';
  return 'application/octet-stream';
}

self.addEventListener('install', (event) => {
  self.skipWaiting();
  event.waitUntil(
    caches.open(CACHE_NAME).then(async (cache) => {
      for (const asset of CORE_ASSETS) {
        try {
          const response = await fetch(new Request(asset, { cache: 'reload' }));
          if (response && response.ok) {
            await cache.put(asset, response);
          }
        } catch (e) {}
      }
    })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME && key !== OTA_CACHE_NAME) {
            return caches.delete(key);
          }
          return Promise.resolve();
        })
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const data = event.data || {};
  if (data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (OTA_ENABLED && data.type === 'OTA_SYNC_GITHUB' && data.sha) {
    event.waitUntil(
      (async () => {
        const sha = String(data.sha);
        const files = Array.isArray(data.files) && data.files.length > 0
          ? data.files
          : ['index.html', 'styles.css', 'v49.css', 'v61.css', 'v92.css', 'v49.js', 'firebase-integration.js', 'asistente-voz.js', 'base-conocimiento.js', 'performance-lite.js', 'actualizaciones-helper.js', 'perfil.html', 'profile.js', 'moderador.html', 'moderator.js'];
        const otaCache = await caches.open(OTA_CACHE_NAME);
        for (const filename of files) {
          if (!filename || filename.startsWith('.') || filename.includes('..')) continue;
          try {
            const rawUrl = `https://raw.githubusercontent.com/${GITHUB_REPO}/${sha}/${encodeURI(filename)}?_t=${Date.now()}`;
            const res = await fetch(rawUrl, { cache: 'no-store' });
            if (res && res.ok) {
              const body = await res.arrayBuffer();
              const headers = new Headers({
                'Content-Type': getMimeType(filename),
                'X-Osito-OTA-SHA': sha,
                'Cache-Control': 'no-cache'
              });
              const localUrl = new URL('./' + filename, self.location.origin + '/').href;
              await otaCache.put(localUrl, new Response(body, { status: 200, headers }));
              if (filename === 'index.html') {
                const rootUrl = new URL('./', self.location.origin + '/').href;
                await otaCache.put(rootUrl, new Response(body, { status: 200, headers }));
              }
            }
          } catch (e) {}
        }
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clientList.forEach((client) => {
          client.postMessage({ type: 'OTA_SYNC_COMPLETE', sha, timestamp: Date.now() });
        });
      })()
    );
  }
  if (data.type === 'CLEAR_CACHE_AND_UPDATE') {
    event.waitUntil(
      (async () => {
        const keys = await caches.keys();
        await Promise.all(keys.filter((k) => k !== OTA_CACHE_NAME).map((k) => caches.delete(k)));
        const cache = await caches.open(CACHE_NAME);
        for (const asset of CORE_ASSETS) {
          try {
            const response = await fetch(new Request(asset, { cache: 'no-store' }));
            if (response && response.ok) {
              await cache.put(asset, response);
            }
          } catch (e) {}
        }
        const clientList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
        clientList.forEach((client) => {
          client.postMessage({ type: 'CACHE_UPDATED', timestamp: Date.now() });
        });
      })()
    );
  }
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch (e) {
    return;
  }

  if (
    url.pathname.startsWith('/api/') ||
    url.hostname.includes('github.com') ||
    url.hostname.includes('githubusercontent.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('firebase') ||
    url.hostname.includes('youtube.com') ||
    url.hostname.includes('ytimg.com')
  ) {
    return;
  }

  if (url.origin !== self.location.origin) {
    return;
  }

  const isCodeOrDoc =
    req.mode === 'navigate' ||
    req.destination === 'document' ||
    req.destination === 'script' ||
    req.destination === 'style' ||
    /\.(html|js|css|json)$/i.test(url.pathname) ||
    url.pathname.endsWith('/');

  if (isCodeOrDoc) {
    event.respondWith(
      (async () => {
        try {
          const freshResponse = await fetch(new Request(req.url, {
            method: 'GET',
            headers: req.headers,
            cache: 'no-store',
            credentials: 'same-origin'
          }));
          if (freshResponse && freshResponse.ok) {
            const cache = await caches.open(CACHE_NAME);
            cache.put(req, freshResponse.clone()).catch(() => {});
          }
          return freshResponse;
        } catch (networkError) {
          if (OTA_ENABLED) {
            const otaCache = await caches.open(OTA_CACHE_NAME);
            const otaMatch = await otaCache.match(req, { ignoreSearch: true });
            if (otaMatch) return otaMatch;
          }
          const cached = await caches.match(req, { ignoreSearch: true });
          if (cached) return cached;
          if (req.mode === 'navigate') {
            const fallbackIndex = await caches.match('./index.html', { ignoreSearch: true });
            if (fallbackIndex) return fallbackIndex;
          }
          throw networkError;
        }
      })()
    );
    return;
  }

  if (req.headers.has('range')) {
    return;
  }

  event.respondWith(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const cached = await cache.match(req, { ignoreSearch: true });
      const networkPromise = fetch(req)
        .then((response) => {
          if (response && response.status === 200) {
            cache.put(req, response.clone()).catch(() => {});
          }
          return response;
        })
        .catch(() => null);

      return cached || (await networkPromise) || Response.error();
    })()
  );
});
