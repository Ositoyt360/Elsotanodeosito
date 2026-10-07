(function () {
    'use strict';

    const State = Object.freeze({
        IDLE: 'idle',
        LISTENING: 'listening',
        PROCESSING: 'processing',
        SPEAKING: 'speaking',
        ERROR: 'error'
    });

    const API_BASE = 'https://www.googleapis.com/youtube/v3';
    const MASCOT_NAME = 'La mascotita del Sotano';
    const DEFAULT_HINT = 'Pulsa el microfono para hablar';
    const CHANNEL_NAME = 'OsitoGamer360YT';
    const LIVE_URL = 'https://www.youtube.com/@OsitoYT360/live';
    const CHANNEL_URL = 'https://www.youtube.com/@OsitoYT360';

    const tabAliases = {
        videos: ['videos', 'video', 'contenido', 'biblioteca', 'principal', 'home'],
        directos: ['directos', 'directo', 'en vivo', 'stream', 'streams', 'transmisiones', 'transmision'],
        canciones: ['canciones', 'musica', 'musica del canal', 'temas', 'songs'],
        populares: ['populares', 'mas vistos', 'mas populares', 'top'],
        animaciones: ['animaciones', 'shorts', 'efectos'],
        series: ['series', 'episodios', 'temporadas'],
        favs: ['favoritos', 'mis favoritos', 'guardados', 'estrellas']
    };

    const toggleAliases = [
        {
            match: ['modo ultra', 'ultra', 'rendimiento', 'acelerar pagina', 'acelerar sitio'],
            action: 'toggleModoUltra'
        },
        {
            match: ['animaciones', 'efectos visuales', 'particulas'],
            action: 'toggleAnimaciones'
        },
        {
            match: ['alertas', 'notificaciones', 'campana'],
            action: 'toggleAlertas'
        }
    ];

    const voiceSynonyms = [
        'hablar',
        'microfono',
        'micronfono',
        'micro',
        'voz'
    ];

    const channelFacts = {
        title: CHANNEL_NAME,
        content: 'videos de videojuegos, directos, shorts, canciones y series',
        youtubeUrl: CHANNEL_URL
    };

    function normalize(value) {
        return String(value || '')
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '')
            .replace(/[^a-z0-9ñ\s]/g, ' ')
            .replace(/\s+/g, ' ')
            .trim();
    }

    function tokenize(text) {
        return normalize(text).split(' ').filter(Boolean);
    }

    function includesAny(text, values) {
        return values.some((value) => normalize(text).includes(normalize(value)));
    }

    function scoreByKeywords(text, keywords) {
        const haystack = ` ${normalize(text)} `;
        return keywords.reduce((score, keyword) => {
            const token = normalize(keyword);
            if (!token) return score;
            return haystack.includes(` ${token} `) ? score + 1 : score;
        }, 0);
    }

    function getEl(id) {
        return document.getElementById(id);
    }

    function showToast(message) {
        const toast = getEl('toast');
        const label = getEl('toast-text');
        if (!toast || !label) return;
        label.textContent = message;
        toast.classList.add('show');
        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => toast.classList.remove('show'), 3200);
    }

    function openAIPanel() {
        const panel = getEl('ai-section');
        const bubble = getEl('ia-bubble');
        if (!panel) return;
        panel.classList.add('active');
        if (bubble) {
            bubble.classList.add('open');
            bubble.setAttribute('aria-expanded', 'true');
        }
    }

    function syncPanelToggleState() {
        const panel = getEl('ai-section');
        const bubble = getEl('ia-bubble');
        if (!panel || !bubble) return;
        const isActive = panel.classList.contains('active');
        bubble.classList.toggle('open', isActive);
        bubble.setAttribute('aria-expanded', isActive ? 'true' : 'false');
    }

    function focusMicButton() {
        const mic = getEl('ai-mic-btn');
        if (mic) mic.focus({ preventScroll: true });
    }

    function openYouTube(url) {
        const destino = String(url || CHANNEL_URL);
        try {
            const nueva = window.open(destino, '_blank', 'noopener');
            if (nueva) return true;
        } catch (e) {}
        try {
            window.location.assign(destino);
            return true;
        } catch (e) {
            return false;
        }
    }

    function dispatchState(state, details = {}) {
        document.dispatchEvent(new CustomEvent('voiceassistant:state', {
            detail: { state, ...details }
        }));
    }

    function extractSearchQuery(text) {
        const patterns = [
            /(?:busca|buscar|encuentra|quiero ver|muestrame|mostrar|reproduce|reproducir|pon|ver|abrir)\s+(?:en\s+youtube\s+)?(?:el\s+)?(?:video|videos|playlist|lista|lista de videos|lista de reproduccion|reproduccion)?\s*(?:de|sobre|para)?\s*(.+)/i,
            /(?:youtube|videos?)\s+(?:de|sobre|para)\s+(.+)/i
        ];
        for (const pattern of patterns) {
            const match = text.match(pattern);
            if (match && match[1]) return match[1].trim();
        }
        return '';
    }

    function detectTab(text) {
        const normalized = normalize(text);
        for (const [tab, aliases] of Object.entries(tabAliases)) {
            if (aliases.some((alias) => normalized.includes(normalize(alias)))) {
                return tab;
            }
        }
        return '';
    }

    function detectToggleAction(text) {
        const normalized = normalize(text);
        for (const entry of toggleAliases) {
            if (entry.match.some((alias) => normalized.includes(normalize(alias)))) {
                return entry.action;
            }
        }
        return '';
    }

    function detectIntent(rawText) {
        const text = String(rawText || '').trim();
        const normalized = normalize(text);

        if (!normalized) return { type: 'unknown' };

        if (includesAny(normalized, [
            'hola', 'buenas', 'saludos', 'que onda', 'que tal', 'hey'
        ])) {
            return { type: 'greeting', text };
        }

        if (includesAny(normalized, [
            'gracias', 'te agradezco', 'muchas gracias', 'se agradece'
        ])) {
            return { type: 'thanks', text };
        }

        if (includesAny(normalized, [
            'que puedo hacer', 'que haces', 'funciones', 'para que sirve',
            'ayuda', 'comandos', 'como usar'
        ])) {
            return { type: 'help' };
        }

        if (includesAny(normalized, [
            'abreme la ia', 'abre la ia', 'abrir ia', 'panel de ia', 'asistente de ia'
        ])) {
            return { type: 'open_ai' };
        }

        if (includesAny(normalized, [
            'abrir chat', 'abre el chat', 'chat en vivo', 'ir al chat', 'mostrar chat'
        ])) {
            return { type: 'open_chat' };
        }

        if (includesAny(normalized, [
            'llévame al canal', 'llevame al canal', 'llevarme al canal',
            'ir al canal', 'abre el canal', 'abrir el canal', 'mostrar canal',
            'muéstrame el canal', 'muestrame el canal',
            'canal de youtube', 'abre youtube', 'ir a youtube', 'abrir canal', 'ver canal'
        ])) {
            return { type: 'open_channel' };
        }

        if (includesAny(normalized, [
            'hay directo', 'estamos en vivo', 'estan en vivo', 'hay stream',
            'transmitiendo ahora', 'directo ahora', 'en vivo ahora', 'directo en vivo'
        ])) {
            return { type: 'check_live' };
        }

        if (includesAny(normalized, ['musica de fondo', 'musica ambiental', 'musica'])) {
            const volumeMatch = normalized.match(/(?:volumen|nivel|al)\s+(?:a|en)?\s*(\d{1,3})\s*(?:por ciento|%|)/);
            if (includesAny(normalized, ['pausa', 'pausar', 'deten', 'detener', 'para la musica', 'silencia', 'silenciar', 'apaga la musica'])) {
                return { type: 'music', action: 'pause' };
            }
            if (includesAny(normalized, ['reanuda', 'reanudar', 'continua', 'continuar', 'reproduce', 'reproducir', 'enciende', 'enciende la musica', 'pon musica'])) {
                return { type: 'music', action: 'play' };
            }
            if (volumeMatch) return { type: 'music', action: 'volume', value: Math.min(100, Math.max(0, Number(volumeMatch[1]))) };
            if (includesAny(normalized, ['baja', 'bajar', 'reduce', 'reducir', 'menos', 'bajale'])) return { type: 'music', action: 'lower' };
            if (includesAny(normalized, ['sube', 'subir', 'aumenta', 'aumentar', 'mas', 'subele'])) return { type: 'music', action: 'raise' };
            return { type: 'music', action: 'toggle' };
        }

        if (includesAny(normalized, ['fuente pequena', 'letra pequena', 'texto pequeno'])) return { type: 'font', value: 13 };
        if (includesAny(normalized, ['fuente grande', 'letra grande', 'texto grande'])) return { type: 'font', value: 18 };
        if (includesAny(normalized, ['fuente normal', 'letra normal', 'tamano normal'])) return { type: 'font', value: 14 };
        if (includesAny(normalized, ['modo compacto', 'diseno compacto', 'vista compacta'])) return { type: 'compact', enabled: true };
        if (includesAny(normalized, ['modo normal', 'quitar modo compacto', 'vista normal'])) return { type: 'compact', enabled: false };
        if (includesAny(normalized, ['tema morado', 'colores morados', 'color morado'])) return { type: 'theme', primary: '#9d00ff', secondary: '#00f2fe' };
        if (includesAny(normalized, ['tema azul', 'colores azul', 'color azul'])) return { type: 'theme', primary: '#00f2fe', secondary: '#58ff9a' };
        if (includesAny(normalized, ['tema fuego', 'colores fuego', 'color rojo'])) return { type: 'theme', primary: '#ff4757', secondary: '#ffa500' };
        if (includesAny(normalized, ['tema verde', 'colores verde', 'color verde'])) return { type: 'theme', primary: '#58ff9a', secondary: '#13b85b' };
        if (includesAny(normalized, ['particulas avanzadas', 'animaciones avanzadas'])) return { type: 'advanced_animation' };
        if (includesAny(normalized, ['siguiente banner', 'siguiente anuncio', 'cambia el banner'])) return { type: 'promo', direction: 1 };
        if (includesAny(normalized, ['banner anterior', 'anuncio anterior'])) return { type: 'promo', direction: -1 };

        if (includesAny(normalized, ['video reciente', 'ultimo video', 'video nuevo', 'videos recientes'])) return { type: 'latest' };
        if (includesAny(normalized, ['guardar este video', 'anadir a favoritos', 'añadir a favoritos'])) return { type: 'favorite' };

        if (includesAny(normalized, [
            'directo', 'stream', 'transmision', 'en vivo'
        ]) && includesAny(normalized, ['ver', 'abrir', 'entrar', 'llevar'])) {
            return { type: 'open_live' };
        }

        const toggleAction = detectToggleAction(text);
        if (toggleAction) {
            return { type: 'toggle', action: toggleAction };
        }

        const tab = detectTab(text);
        if (tab) return { type: 'tab', tab };

        if (includesAny(normalized, ['hora', 'que hora', 'que fecha', 'fecha de hoy'])) {
            return { type: 'time' };
        }

        if (includesAny(normalized, ['playlist', 'listas de reproduccion', 'listas', 'albumes'])) {
            return { type: 'playlists' };
        }

        const query = extractSearchQuery(text);
        if (query) {
            return { type: 'search', query };
        }

        return { type: 'forward', text };
    }

    class YouTubeService {
        static get apiKey() {
            return window.GOOGLE_API_KEY || '';
        }

        static get channelId() {
            return window.YOUTUBE_CHANNEL_ID || '';
        }

        static get oauthToken() {
            return window.YOUTUBE_ACCESS_TOKEN || window.YOUTUBE_OAUTH_TOKEN || '';
        }

        static get playlistConfigs() {
            return window.PLAYLISTS || {};
        }

        static async request(endpoint, params = {}, options = {}) {
            const query = new URLSearchParams();
            Object.entries(params).forEach(([key, value]) => {
                if (value !== undefined && value !== null && value !== '') {
                    query.set(key, value);
                }
            });

            if (this.apiKey && !options.useOAuth) {
                query.set('key', this.apiKey);
            }

            const headers = { Accept: 'application/json' };
            if (options.useOAuth && this.oauthToken) {
                headers.Authorization = `Bearer ${this.oauthToken}`;
            }

            const response = await fetch(`${API_BASE}/${endpoint}?${query.toString()}`, {
                headers
            });

            if (!response.ok) {
                throw new Error(`YouTube API ${response.status}`);
            }

            return response.json();
        }

        static async getPlaylistItems(playlistId, maxPages = 3) {
            const cache = this._playlistCache || (this._playlistCache = new Map());
            if (cache.has(playlistId)) return cache.get(playlistId);

            const items = [];
            let pageToken = '';
            let pages = 0;

            while (pages < maxPages) {
                const data = await this.request('playlistItems', {
                    part: 'snippet,contentDetails',
                    maxResults: '50',
                    playlistId,
                    pageToken
                });

                (data.items || []).forEach((item) => {
                    const videoId = item.contentDetails?.videoId || item.snippet?.resourceId?.videoId;
                    if (!videoId) return;
                    items.push({
                        id: videoId,
                        title: item.snippet?.title || 'Video del canal',
                        description: item.snippet?.description || '',
                        playlistId
                    });
                });

                pageToken = data.nextPageToken || '';
                pages += 1;
                if (!pageToken) break;
            }

            cache.set(playlistId, items);
            return items;
        }

        static async getAllConfiguredPlaylists() {
            const configs = Object.entries(this.playlistConfigs);
            const rows = [];
            for (const [category, config] of configs) {
                if (!config?.id) continue;
                const items = await this.getPlaylistItems(config.id);
                rows.push({ category, config, items });
            }
            return rows;
        }

        static async searchVideos(query, limit = 8) {
            const normalizedQuery = normalize(query);
            const localMatches = [];
            const localSources = window.videosPorCategoria || {};

            Object.entries(localSources).forEach(([category, videos]) => {
                (videos || []).forEach((video) => {
                    const id = typeof video === 'string'
                        ? video
                        : (video.id || video.videoId);
                    const titleSource = typeof video === 'string'
                        ? video
                        : (video.title || video.name || '');
                    const title = normalize(titleSource);
                    if (!id) return;
                    const exact = title.includes(normalizedQuery);
                    const overlap = scoreByKeywords(title, tokenize(normalizedQuery));
                    if (exact || overlap >= 2) {
                        localMatches.push({
                            id,
                            title: titleSource || `Video ${id}`,
                            category,
                            source: 'local'
                        });
                    }
                });
            });

            if (localMatches.length) {
                return dedupeVideos(localMatches).slice(0, limit);
            }

            const playlistRows = await this.getAllConfiguredPlaylists();
            const playlistMatches = [];
            playlistRows.forEach(({ category, items }) => {
                (items || []).forEach((video) => {
                    const title = normalize(video.title);
                    const score = scoreByKeywords(title, tokenize(normalizedQuery));
                    if (title.includes(normalizedQuery) || score >= 1) {
                        playlistMatches.push({ ...video, category, source: 'playlist' });
                    }
                });
            });

            if (playlistMatches.length) {
                return dedupeVideos(playlistMatches).slice(0, limit);
            }

            const data = await this.request('search', {
                part: 'snippet',
                type: 'video',
                maxResults: String(limit),
                q: query
            });

            const results = (data.items || []).map((item) => ({
                id: item.id?.videoId,
                title: item.snippet?.title || 'Video de YouTube',
                source: 'youtube'
            })).filter((item) => item.id);

            return dedupeVideos(results).slice(0, limit);
        }

        static async listPlaylists() {
            if (this.oauthToken) {
                const data = await this.request('playlists', {
                    part: 'snippet,contentDetails',
                    mine: 'true',
                    maxResults: '25'
                }, { useOAuth: true });

                return (data.items || []).map((item) => ({
                    id: item.id,
                    title: item.snippet?.title || 'Lista de reproduccion',
                    description: item.snippet?.description || '',
                    itemCount: item.contentDetails?.itemCount || 0
                }));
            }

            const configs = Object.entries(this.playlistConfigs);
            const ids = configs.map(([, config]) => config?.id).filter(Boolean);

            if (!ids.length) {
                return [];
            }

            const data = await this.request('playlists', {
                part: 'snippet,contentDetails',
                id: ids.join(',')
            });

            return (data.items || []).map((item) => ({
                id: item.id,
                title: item.snippet?.title || 'Lista de reproduccion',
                description: item.snippet?.description || '',
                itemCount: item.contentDetails?.itemCount || 0
            }));
        }

        static async checkLive() {
            const params = {
                part: 'snippet',
                type: 'video',
                eventType: 'live',
                maxResults: '1'
            };

            if (this.channelId) {
                params.channelId = this.channelId;
            } else {
                params.q = CHANNEL_NAME;
            }

            const data = await this.request('search', params);
            const item = (data.items || [])[0];
            const live = Boolean(item?.id?.videoId);
            const result = live ? {
                live: true,
                title: item.snippet?.title || 'Directo en vivo',
                url: `https://www.youtube.com/watch?v=${item.id.videoId}`
            } : {
                live: false,
                title: '',
                url: LIVE_URL
            };

            syncLiveIndicators(result);
            return result;
        }
    }

    function dedupeVideos(videos) {
        const seen = new Set();
        return videos.filter((video) => {
            const key = String(video.id || '').trim();
            if (!key || seen.has(key)) return false;
            seen.add(key);
            return true;
        });
    }

    function syncLiveIndicators(result) {
        const liveIds = ['ai-live-indicator', 'youtube-live-corner'];
        liveIds.forEach((id) => {
            const el = getEl(id);
            if (!el) return;
            el.classList.toggle('show', Boolean(result.live));
            el.style.display = result.live ? 'inline-flex' : 'none';
            el.href = result.live ? result.url : LIVE_URL;
            el.setAttribute('aria-label', result.live ? `Directo activo: ${result.title}` : 'No hay directo activo');
        });
    }

    function renderSearchResults(results, query) {
        const grid = getEl('main-video-grid');
        if (!grid) return;

        grid.replaceChildren();

        if (!results.length) {
            const empty = document.createElement('p');
            empty.textContent = `No encontre resultados para "${query}".`;
            grid.appendChild(empty);
            return;
        }

        results.forEach((video) => {
            const card = document.createElement('a');
            card.className = 'video-card';
            card.href = `https://www.youtube.com/watch?v=${encodeURIComponent(video.id)}`;
            card.target = '_blank';
            card.rel = 'noopener';
            card.innerHTML = `
                <img src="https://i.ytimg.com/vi/${encodeURIComponent(video.id)}/hqdefault.jpg" alt="">
                <span>${escapeHtml(video.title || 'Video')}</span>
            `;
            grid.appendChild(card);
        });
    }

    function escapeHtml(value) {
        return String(value || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function setStatusLabel(message) {
        const status = getEl('ai-voice-status');
        if (status) status.textContent = message || DEFAULT_HINT;
    }

    function syncVoiceButton(enabled) {
        const toggle = getEl('ai-voice-toggle');
        if (!toggle) return;
        toggle.classList.toggle('active', enabled);
        toggle.innerHTML = enabled
            ? '<span class="btn-icon">🔊</span> Voz On'
            : '<span class="btn-icon">🔇</span> Voz Off';
    }

    // Tiempos de espera y configuración inteligente del micrófono (ajustables en Configuración).
    const ESPERA_SIN_HABLAR_MS = 10000; // Si nadie dice nada, se apaga a los 10s.
    const ES_MOVIL_O_ANDROID = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini|Mobile/i.test(navigator.userAgent || '');

    function obtenerEsperaSilencioMs() {
        const guardado = parseInt(localStorage.getItem('osito_mic_silence_ms') || '1050', 10);
        return Number.isFinite(guardado) ? Math.min(2500, Math.max(650, guardado)) : 1050;
    }
    function antiRepeticionActiva() {
        return localStorage.getItem('osito_mic_anti_repeat') !== 'false';
    }

    function soloAlfanumerico(texto) {
        return normalize(texto).replace(/\s+/g, '');
    }

    // Limpia repeticiones consecutivas y sílabas partidas del micrófono en Android/Chrome
    // (ej. "Bienbi enbie nBien" -> "Bien", "cómo cómo cómo" -> "cómo", "hola hola" -> "hola")
    function limpiarRepeticionesVoz(texto) {
        let limpio = String(texto || '').replace(/\s+/g, ' ').trim();
        if (!limpio) return '';

        // 1. Detector de repetición sin espacios (arregla el bug de Android Chrome: "Bienbi enbie nBien" -> "bienbienbienbien" -> "Bien")
        const compacto = soloAlfanumerico(limpio);
        if (compacto.length >= 4) {
            const matchRep3 = compacto.match(/^([a-z0-9ñ]{3,28}?)\1+$/i);
            const matchRep2 = !matchRep3 ? compacto.match(/^([a-z0-9ñ]{2})\1{2,}$/i) : null;
            const unidadRepetida = (matchRep3 && matchRep3[1]) || (matchRep2 && matchRep2[1]) || '';
            if (unidadRepetida) {
                const palabrasOrig = limpio.split(' ').filter(Boolean);
                // Si la primera o última palabra ya es exactamente la unidad limpia (ej. "Bien" en "Bienbi enbie nBien"), devolverla con su mayúscula original
                for (let idx = palabrasOrig.length - 1; idx >= 0; idx--) {
                    if (soloAlfanumerico(palabrasOrig[idx]) === unidadRepetida) {
                        return palabrasOrig[idx];
                    }
                }
                // Si era una frase corta repetida o una palabra pegada, reconstruir una sola vez la unidad
                let acumulado = '';
                const reconstruido = [];
                for (let idx = 0; idx < palabrasOrig.length; idx++) {
                    const trozo = soloAlfanumerico(palabrasOrig[idx]);
                    if (!trozo) continue;
                    if ((acumulado + trozo).length <= unidadRepetida.length && unidadRepetida.startsWith(acumulado + trozo)) {
                        reconstruido.push(palabrasOrig[idx]);
                        acumulado += trozo;
                        if (acumulado === unidadRepetida) break;
                    } else if (!acumulado && palabrasOrig[idx].length >= unidadRepetida.length) {
                        const recorte = palabrasOrig[idx].slice(0, unidadRepetida.length);
                        if (soloAlfanumerico(recorte) === unidadRepetida) return recorte;
                    }
                }
                if (acumulado === unidadRepetida && reconstruido.length > 0) {
                    return reconstruido.join(' ');
                }
                return unidadRepetida.charAt(0).toUpperCase() + unidadRepetida.slice(1);
            }
        }

        if (!antiRepeticionActiva()) return limpio;

        // 2. Despegar palabras duplicadas dentro de un mismo token (ej. "cómocómo" -> "cómo", "bienbien" -> "bien")
        const tokensLimpios = limpio.split(' ').map((tok) => {
            const tokNorm = soloAlfanumerico(tok);
            if (tokNorm.length >= 6) {
                const m = tokNorm.match(/^([a-z0-9ñ]{3,16}?)\1+$/i);
                if (m && m[1]) {
                    const ratio = m[1].length / tokNorm.length;
                    const lenOriginal = Math.max(1, Math.round(tok.length * ratio));
                    return tok.slice(0, lenOriginal);
                }
            }
            return tok;
        });

        // 3. Si una palabra es seguida por fragmentos partidos de sí misma (ej. "Bien bi en" o "bie n"), saltar los fragmentos
        const sinEcoSilabas = [];
        for (let i = 0; i < tokensLimpios.length; i++) {
            const actual = tokensLimpios[i];
            const actualCompacto = soloAlfanumerico(actual);
            if (sinEcoSilabas.length > 0) {
                const prevCompacto = soloAlfanumerico(sinEcoSilabas[sinEcoSilabas.length - 1]);
                if (prevCompacto.length >= 3) {
                    const sig1 = soloAlfanumerico(tokensLimpios[i] || '');
                    const sig2 = soloAlfanumerico(tokensLimpios[i + 1] || '');
                    const sig3 = soloAlfanumerico(tokensLimpios[i + 2] || '');
                    if (sig1 && sig2 && (sig1 + sig2) === prevCompacto) {
                        i += 1;
                        continue;
                    }
                    if (sig1 && sig2 && sig3 && (sig1 + sig2 + sig3) === prevCompacto) {
                        i += 2;
                        continue;
                    }
                    // Caso "Bienbi" (palabra previa + inicio de la misma palabra)
                    if (actualCompacto.length > prevCompacto.length && actualCompacto.startsWith(prevCompacto) && prevCompacto.startsWith(actualCompacto.slice(prevCompacto.length))) {
                        continue;
                    }
                }
            }
            if (actualCompacto && sinEcoSilabas.length > 0 && actualCompacto === soloAlfanumerico(sinEcoSilabas[sinEcoSilabas.length - 1])) {
                continue;
            }
            sinEcoSilabas.push(actual);
        }

        // 4. Colapsar pares y tríos de palabras repetidas seguidas (ej. "como estas como estas" -> "como estas")
        const resultado = [];
        let i = 0;
        while (i < sinEcoSilabas.length) {
            if (i + 5 < sinEcoSilabas.length) {
                const trio1 = normalize(sinEcoSilabas[i] + ' ' + sinEcoSilabas[i + 1] + ' ' + sinEcoSilabas[i + 2]);
                const trio2 = normalize(sinEcoSilabas[i + 3] + ' ' + sinEcoSilabas[i + 4] + ' ' + sinEcoSilabas[i + 5]);
                if (trio1 && trio1 === trio2) {
                    resultado.push(sinEcoSilabas[i], sinEcoSilabas[i + 1], sinEcoSilabas[i + 2]);
                    i += 6;
                    while (i + 2 < sinEcoSilabas.length && normalize(sinEcoSilabas[i] + ' ' + sinEcoSilabas[i + 1] + ' ' + sinEcoSilabas[i + 2]) === trio1) {
                        i += 3;
                    }
                    continue;
                }
            }
            if (i + 3 < sinEcoSilabas.length) {
                const par1 = normalize(sinEcoSilabas[i] + ' ' + sinEcoSilabas[i + 1]);
                const par2 = normalize(sinEcoSilabas[i + 2] + ' ' + sinEcoSilabas[i + 3]);
                if (par1 && par1 === par2) {
                    resultado.push(sinEcoSilabas[i], sinEcoSilabas[i + 1]);
                    i += 4;
                    while (i + 1 < sinEcoSilabas.length && normalize(sinEcoSilabas[i] + ' ' + sinEcoSilabas[i + 1]) === par1) {
                        i += 2;
                    }
                    continue;
                }
            }
            resultado.push(sinEcoSilabas[i]);
            i += 1;
        }

        return resultado.join(' ').replace(/\s+/g, ' ').trim();
    }

    // Une dos fragmentos de voz evitando el bug acumulativo de Chrome/Android donde results[1] repite o parte en sílabas results[0]
    function unirSegmentosVozSinSolapar(base, nuevo) {
        const a = String(base || '').replace(/\s+/g, ' ').trim();
        const b = String(nuevo || '').replace(/\s+/g, ' ').trim();
        if (!a) return limpiarRepeticionesVoz(b);
        if (!b) return limpiarRepeticionesVoz(a);

        const aNorm = normalize(a);
        const bNorm = normalize(b);
        if (!aNorm) return limpiarRepeticionesVoz(b);
        if (!bNorm) return limpiarRepeticionesVoz(a);

        if (aNorm === bNorm) return limpiarRepeticionesVoz(b);
        if (bNorm.startsWith(aNorm)) return limpiarRepeticionesVoz(b);
        if (aNorm.startsWith(bNorm)) return limpiarRepeticionesVoz(a);
        if (aNorm.endsWith(' ' + bNorm)) return limpiarRepeticionesVoz(a);

        // Comparación sin espacios: detecta cuando Android parte la misma palabra en sílabas ("Bien" vs "bi en" vs "bie n")
        const aCompact = aNorm.replace(/\s+/g, '');
        const bCompact = bNorm.replace(/\s+/g, '');
        if (aCompact && bCompact) {
            if (aCompact === bCompact) {
                // Conservar el que tenga menos fragmentos sueltos de 1-2 letras
                return limpiarRepeticionesVoz(a.split(' ').length <= b.split(' ').length ? a : b);
            }
            if (bCompact.startsWith(aCompact)) return limpiarRepeticionesVoz(b);
            if (aCompact.startsWith(bCompact)) return limpiarRepeticionesVoz(a);
            if (aCompact.endsWith(bCompact)) return limpiarRepeticionesVoz(a);
        }

        const aWords = a.split(' ');
        const bWords = b.split(' ');
        const maxOverlap = Math.min(aWords.length, bWords.length, 8);
        for (let k = maxOverlap; k >= 1; k--) {
            const sufijoA = soloAlfanumerico(aWords.slice(aWords.length - k).join(' '));
            const prefijoB = soloAlfanumerico(bWords.slice(0, k).join(' '));
            if (sufijoA && sufijoA === prefijoB) {
                return limpiarRepeticionesVoz(aWords.concat(bWords.slice(k)).join(' '));
            }
        }
        return limpiarRepeticionesVoz(a + ' ' + b);
    }

    window.limpiarRepeticionesVozOsito = limpiarRepeticionesVoz;

    function escribirEnCajaChatEnVivo(texto, esParcial) {
        const input = getEl('ai-input');
        const form = getEl('ai-form');
        const callSub = getEl('ia-call-subtitle');
        const callBadge = getEl('ia-call-state-badge');
        if (input) {
            if (input.disabled) {
                // Si el usuario aún no había tocado Osito/Osita, seleccionamos Osito automáticamente al hablar por micrófono
                const btnMale = document.querySelector('.ai-gender-btn[data-gender="male"]');
                if (btnMale) btnMale.click();
                input.disabled = false;
            }
            input.value = texto;
            input.classList.toggle('ia-input-dictating', Boolean(esParcial && texto));
            input.dispatchEvent(new Event('input', { bubbles: true }));
            input.scrollTop = input.scrollHeight;
        }
        if (callSub && window.ositoEnLlamadaIA) {
            callSub.textContent = texto
                ? `🎙️ Tú: "${texto}"`
                : '🎙️ Micrófono encendido · Te escucho, habla cuando quieras...';
        }
        if (callBadge && window.ositoEnLlamadaIA && esParcial) {
            callBadge.textContent = texto ? '🎙️ Escuchando tu voz...' : '🎙️ Tu turno · Micrófono activo';
        }
        if (form) {
            let banner = form.querySelector('.ia-mic-live-banner');
            if (!banner) {
                banner = document.createElement('div');
                banner.className = 'ia-mic-live-banner';
                banner.setAttribute('aria-live', 'polite');
                banner.innerHTML =
                    '<span class="ia-mic-wave" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>' +
                    '<span class="ia-mic-live-text">Escuchando tu voz...</span>';
                form.insertBefore(banner, form.firstChild);
            }
            const txtEl = banner.querySelector('.ia-mic-live-text');
            if (txtEl) {
                txtEl.textContent = texto ? `🎙️ "${texto}"` : '🎙️ Escuchando... habla ahora';
            }
        }
    }

    function esModoInvitado() {
        if (typeof window.osEsInvitado === 'function') return window.osEsInvitado();
        if (window.ositoGuestMode) return true;
        return document.body.classList.contains('solo-invitado');
    }

    class PushToTalkAssistant {
        constructor() {
            this.state = State.IDLE;
            this.recognition = null;
            this.isListening = false;
            this.voiceOutputEnabled = localStorage.getItem('osito_ai_voz') !== 'false';
            this.pendingSpeech = null;
            this.accumulatedTranscript = '';
            this.sessionFinalResults = Object.create(null);
            this.hasHeardSpeech = false;
            this.sessionStartTime = 0;
            this.lastSpeechTime = 0;
            this.deadlineTimeoutId = null;
            this.manualStop = false;
            this.intentionalStop = false;
            this.setupRecognition();
            this.syncUI();
        }

        syncUI() {
            syncVoiceButton(this.voiceOutputEnabled);
            setStatusLabel(DEFAULT_HINT);
            dispatchState(State.IDLE, { label: DEFAULT_HINT });
        }

        setState(state, details = {}) {
            this.state = state;
            dispatchState(state, details);
        }

        setupRecognition() {
            const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
            if (!SpeechRecognition) return;

            this.recognition = new SpeechRecognition();
            this.recognition.lang = 'es-MX';
            // En Android Chrome, continuous = true duplica cada sílaba parcial en event.results (ej. "Bienbi enbie nBien").
            // Desactivarlo en móviles hace que el reconocedor nativo escuche la frase limpia de principio a fin sin duplicar.
            this.recognition.continuous = !ES_MOVIL_O_ANDROID;
            this.recognition.interimResults = true;
            this.recognition.maxAlternatives = 1;

            this.recognition.onstart = () => {
                this.sessionFinalResults = Object.create(null);
                this.isListening = true;
                this.setState(State.LISTENING, { label: 'Escuchando... habla ahora' });
                if (!this.hasHeardSpeech) {
                    escribirEnCajaChatEnVivo('', true);
                }
                this.scheduleDeadlineCheck();
            };

            this.recognition.onresult = (event) => {
                let sessionCombined = '';
                let hasAny = false;
                if (ES_MOVIL_O_ANDROID && event.results && event.results.length > 0) {
                    // En móvil tomamos el resultado más reciente y completo para evitar que resultados intermedios viejos se concatenen
                    const lastIdx = event.results.length - 1;
                    const ultimo = String(event.results[lastIdx]?.[0]?.transcript || '').trim();
                    const primero = String(event.results[0]?.[0]?.transcript || '').trim();
                    sessionCombined = unirSegmentosVozSinSolapar(primero, ultimo);
                    hasAny = Boolean(sessionCombined);
                } else {
                    for (let i = 0; i < event.results.length; i++) {
                        const result = event.results[i];
                        const spoken = String(result?.[0]?.transcript || '').trim();
                        if (!spoken) continue;
                        hasAny = true;
                        sessionCombined = unirSegmentosVozSinSolapar(sessionCombined, spoken);
                    }
                }
                sessionCombined = limpiarRepeticionesVoz(sessionCombined);

                if (hasAny && sessionCombined) {
                    this.hasHeardSpeech = true;
                    this.lastSpeechTime = Date.now();
                    const textoEnVivo = limpiarRepeticionesVoz(unirSegmentosVozSinSolapar(this.baseBeforeRestart || '', sessionCombined));
                    this.accumulatedTranscript = textoEnVivo;
                    this.pendingSpeech = null;

                    const normEnVivo = normalize(textoEnVivo);
                    if (window.ositoEnLlamadaIA && /\b(cuelga( la llamada)?|colgar( la llamada)?|termina(r)?( la)? llamada|finaliza(r)?( la)? llamada|corta(r)?( la)? llamada|cierra( la)? llamada|salir de( la)? llamada)\b/.test(normEnVivo)) {
                        this.accumulatedTranscript = '';
                        this.baseBeforeRestart = '';
                        this.pendingSpeech = null;
                        this.stopListening();
                        const input = getEl('ai-input');
                        if (input) {
                            input.value = '';
                            input.classList.remove('ia-input-dictating');
                        }
                        if (typeof window.finalizarLlamadaIA === 'function') {
                            window.finalizarLlamadaIA();
                        }
                        return;
                    }
                    escribirEnCajaChatEnVivo(textoEnVivo, true);
                    setStatusLabel(textoEnVivo ? `🎙️ ${textoEnVivo}` : 'Escuchando... habla ahora');
                    this.scheduleDeadlineCheck();
                }
            };

            this.recognition.onerror = (event) => {
                if (event.error === 'no-speech' || event.error === 'aborted') {
                    return;
                }
                this.manualStop = true;
                this.detenerTemporizadorDeadline();
                this.isListening = false;
                const label = event.error === 'not-allowed'
                    ? 'Permiso de microfono denegado'
                    : DEFAULT_HINT;
                this.setState(State.ERROR, { label, error: event.error });
                setStatusLabel(label);
                if (event.error === 'not-allowed') {
                    showToast('Concede permiso al microfono para usar La mascotita del Sotano.');
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                this.detenerTemporizadorDeadline();

                const fueUnCorteIntencional = this.intentionalStop || this.manualStop;
                this.intentionalStop = false;

                if (!fueUnCorteIntencional) {
                    const ahora = Date.now();
                    const esperaSilencio = window.ositoEnLlamadaIA ? 920 : obtenerEsperaSilencioMs();
                    const siguePendienteDeHablar = !this.hasHeardSpeech
                        && (ahora - this.sessionStartTime) < ESPERA_SIN_HABLAR_MS;
                    // En móvil/Android, cuando el reconocedor termina tras haber escuchado voz, ya cerró la frase completa:
                    // no reiniciamos encima para evitar eco de buffer ("Bienbi enbie nBien").
                    const siguePendienteDeSilencioFinal = !ES_MOVIL_O_ANDROID
                        && this.hasHeardSpeech
                        && (ahora - this.lastSpeechTime) < esperaSilencio;

                    if (siguePendienteDeHablar || siguePendienteDeSilencioFinal) {
                        this.baseBeforeRestart = limpiarRepeticionesVoz(this.accumulatedTranscript || '');
                        try {
                            this.recognition.start();
                            return;
                        } catch (error) {
                            console.warn('[VoiceAssistant] No se pudo reiniciar el micrófono', error);
                        }
                    }
                }

                const transcript = limpiarRepeticionesVoz(this.accumulatedTranscript || this.pendingSpeech || '');
                this.accumulatedTranscript = '';
                this.baseBeforeRestart = '';
                this.pendingSpeech = null;
                const inputEl = getEl('ai-input');
                if (inputEl) inputEl.classList.remove('ia-input-dictating');
                if (transcript) {
                    escribirEnCajaChatEnVivo(transcript, false);
                    if (window.ositoEnLlamadaIA && window.CallModeEngine && typeof window.CallModeEngine.procesarEntradaUsuario === 'function') {
                        window.CallModeEngine.procesarEntradaUsuario(transcript);
                        return;
                    }
                    const callBadge = getEl('ia-call-state-badge');
                    if (callBadge && window.ositoEnLlamadaIA) {
                        callBadge.textContent = '⚡ Micrófono apagado · Pensando respuesta...';
                    }
                    this.process(transcript);
                    return;
                }
                if (window.ositoEnLlamadaIA && !this.manualStop && !(window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending))) {
                    setTimeout(() => {
                        if (window.ositoEnLlamadaIA && !this.isListening && !(window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending))) {
                            this.startListening(true);
                        }
                    }, 260);
                    return;
                }
                if (this.state === State.LISTENING) {
                    this.setState(State.IDLE, { label: DEFAULT_HINT });
                }
                setStatusLabel(DEFAULT_HINT);
            };
        }

        scheduleDeadlineCheck() {
            this.detenerTemporizadorDeadline();
            const esperaSilencio = window.ositoEnLlamadaIA ? 920 : obtenerEsperaSilencioMs();
            const deadline = this.hasHeardSpeech
                ? this.lastSpeechTime + esperaSilencio
                : this.sessionStartTime + ESPERA_SIN_HABLAR_MS;
            const delay = Math.max(0, deadline - Date.now());
            this.deadlineTimeoutId = setTimeout(() => this.checkDeadline(), delay);
        }

        checkDeadline() {
            if (!this.isListening) return;
            const ahora = Date.now();
            const esperaSilencio = window.ositoEnLlamadaIA ? 920 : obtenerEsperaSilencioMs();
            if (this.hasHeardSpeech) {
                if ((ahora - this.lastSpeechTime) >= esperaSilencio) {
                    this.finalizarEscucha();
                } else {
                    this.scheduleDeadlineCheck();
                }
            } else if ((ahora - this.sessionStartTime) >= ESPERA_SIN_HABLAR_MS) {
                if (window.ositoEnLlamadaIA) {
                    this.sessionStartTime = Date.now();
                    this.scheduleDeadlineCheck();
                    return;
                }
                setStatusLabel('No escuché nada, inténtalo de nuevo.');
                this.finalizarEscucha();
            } else {
                this.scheduleDeadlineCheck();
            }
        }

        // Corte "a propósito": ya se cumplió el tiempo de espera que corresponde,
        // así que aquí sí terminamos de verdad (a diferencia de un corte
        // inesperado del navegador, que se reinicia solo).
        finalizarEscucha() {
            this.intentionalStop = true;
            try {
                this.recognition?.stop();
            } catch (error) {
                console.warn('[VoiceAssistant]', error);
            }
        }

        stopListening() {
            this.manualStop = true;
            this.intentionalStop = true;
            this.detenerTemporizadorDeadline();
            if (this.isListening) {
                try {
                    this.recognition?.stop();
                } catch (e) {}
            }
            this.isListening = false;
        }

        startListening(silencioso = false) {
            if (esModoInvitado()) {
                if (!silencioso) showToast('¡Inicia sesión o crea una cuenta para usar el micrófono! 🎙️✨');
                return false;
            }
            if (!this.recognition) {
                if (!silencioso) showToast('Este navegador no admite reconocimiento de voz.');
                return false;
            }
            if (this.isListening) return true;
            if (window.speechSynthesis && (window.speechSynthesis.speaking || window.speechSynthesis.pending)) {
                if (!window.ositoEnLlamadaIA) {
                    window.speechSynthesis.cancel();
                } else {
                    return false;
                }
            }
            this.manualStop = false;
            this.intentionalStop = false;
            this.hasHeardSpeech = false;
            this.sessionStartTime = Date.now();
            this.lastSpeechTime = 0;
            this.accumulatedTranscript = '';
            this.baseBeforeRestart = '';
            this.pendingSpeech = null;
            try {
                this.recognition.start();
                return true;
            } catch (error) {
                console.warn('[VoiceAssistant]', error);
                return false;
            }
        }

        detenerTemporizadorDeadline() {
            if (this.deadlineTimeoutId) {
                clearTimeout(this.deadlineTimeoutId);
                this.deadlineTimeoutId = null;
            }
        }

        openPanel() {
            openAIPanel();
            focusMicButton();
        }

        toggleVoiceOutput() {
            this.voiceOutputEnabled = !this.voiceOutputEnabled;
            localStorage.setItem('osito_ai_voz', this.voiceOutputEnabled ? 'true' : 'false');
            if (!this.voiceOutputEnabled && 'speechSynthesis' in window) {
                window.speechSynthesis.cancel();
            }
            syncVoiceButton(this.voiceOutputEnabled);
            if (this.voiceOutputEnabled) {
                this.speak('Voz activada');
            } else {
                showToast('Voz desactivada');
            }
        }

        toggle() {
            if (this.state === State.SPEAKING) {
                window.speechSynthesis?.cancel();
                this.setState(State.IDLE, { label: DEFAULT_HINT });
                setStatusLabel(DEFAULT_HINT);
                if (window.ositoEnLlamadaIA) {
                    setTimeout(() => this.startListening(true), 180);
                }
                return;
            }

            if (this.isListening) {
                if (this.hasHeardSpeech && (this.accumulatedTranscript || this.pendingSpeech)) {
                    this.finalizarEscucha();
                } else {
                    this.stopListening();
                    this.setState(State.IDLE, { label: DEFAULT_HINT });
                    setStatusLabel(DEFAULT_HINT);
                }
                return;
            }

            this.startListening(false);
        }

        async process(rawText) {
            this.manualStop = true;
            try { this.recognition?.stop(); } catch (error) { /* ya estaba detenido */ }
            this.setState(State.PROCESSING, { label: 'Procesando...', text: rawText });
            setStatusLabel('Procesando...');
            document.dispatchEvent(new CustomEvent('voiceassistant:recognized', { detail: { text: rawText } }));

            let command = detectIntent(rawText);
            let response = '';

            // La IA ahora responde cualquier pregunta y conversa con OpenAI. Si lo dicho es una pregunta
            // o una frase conversacional, no se confunde con una orden del sitio y se envía al panel de IA.
            const normRaw = normalize(rawText);
            if (/\b(cuelga( la llamada)?|colgar( la llamada)?|termina(r)?( la)? llamada|finaliza(r)?( la)? llamada|corta(r)?( la)? llamada|cierra( la)? llamada|salir de( la)? llamada)\b/.test(normRaw)) {
                const input = getEl('ai-input');
                if (input) input.value = '';
                if (typeof window.finalizarLlamadaIA === 'function') {
                    window.finalizarLlamadaIA();
                }
                this.setState(State.IDLE, { label: DEFAULT_HINT });
                setStatusLabel(DEFAULT_HINT);
                return;
            }
            const ES_ORDEN_SITIO_ESTRICTA = /^(abre el chat|abrir chat|abrir el chat|ir al chat|abre el canal|abrir canal|ir al canal|llevame al canal|pausa la musica|reanuda la musica|apaga la musica|enciende la musica|activar modo ultra|desactivar modo ultra|cambia a pestana|abrir pestana)\b/;
            if (!ES_ORDEN_SITIO_ESTRICTA.test(normRaw)) {
                command = { type: 'forward', text: limpiarRepeticionesVoz(rawText) };
            }

            try {
                response = await this.executeCommand(command, rawText);
            } catch (error) {
                console.error('[VoiceAssistant]', error);
                response = 'No pude completar esa accion. Revisa la conexion con YouTube.';
            }

            if (response) {
                await this.speak(response);
            } else {
                // La respuesta ya la habla el panel de IA (index.html).
                this.setState(State.IDLE, { label: DEFAULT_HINT });
                setStatusLabel(DEFAULT_HINT);
            }
        }

        async executeCommand(command, rawText) {
            if (window.OsitoConocimiento && typeof window.OsitoConocimiento.buscarEnBaseConocimiento === 'function') {
                const ans = window.OsitoConocimiento.buscarEnBaseConocimiento(rawText);
                if (ans) {
                    const input = getEl('ai-input');
                    const form = getEl('ai-form');
                    if (input && form) {
                        input.value = rawText;
                        if (typeof form.requestSubmit === 'function') {
                            form.requestSubmit();
                        } else {
                            form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                        }
                    }
                    // No hablamos aquí: el panel de IA (index.html) ya muestra y
                    // lee en voz alta la respuesta al procesar el envío del
                    // formulario. Hablar también aquí provocaba que ambas voces
                    // se cancelaran entre sí y no se escuchara nada.
                    return '';
                }
            }

            if (command.type === 'open_ai') {
                this.openPanel();
                return 'Abrí el panel de inteligencia. Usa el microfono dentro del panel para hablar.';
            }

            if (command.type === 'open_chat') {
                window.toggleLiveChatPanel?.();
                return 'Abrí el chat en vivo.';
            }

            if (command.type === 'open_channel') {
                openYouTube(CHANNEL_URL);
                return 'Abrí el canal de YouTube.';
            }

            if (command.type === 'open_live') {
                const live = await YouTubeService.checkLive();
                if (live.live) {
                    openYouTube(live.url);
                    return `Te llevo al directo activo: ${live.title}.`;
                }
                openYouTube(LIVE_URL);
                return 'Ahora mismo no hay un directo activo, pero te abri la pagina de transmisiones.';
            }

            if (command.type === 'check_live') {
                showToast('Consultando transmisiones en vivo...');
                const live = await YouTubeService.checkLive();
                return live.live
                    ? `Si, estamos en vivo: ${live.title}. Pulsa el indicador rojo para entrar.`
                    : 'Ahora mismo no hay una transmision en vivo.';
            }

            if (command.type === 'tab') {
                this.openTab(command.tab);
                return `Abriendo ${command.tab}.`;
            }

            if (command.type === 'toggle') {
                this.runToggle(command.action);
                return this.toggleResponse(command.action);
            }

            if (command.type === 'music') {
                return this.runMusic(command.action, command.value);
            }

            if (command.type === 'font') {
                document.documentElement.style.fontSize = `${command.value}px`;
                localStorage.setItem('osito_font_size', String(command.value));
                const slider = getEl('font-size-range');
                if (slider) slider.value = String(command.value);
                return `He cambiado el tamano de letra a ${command.value} pixeles.`;
            }

            if (command.type === 'compact') {
                document.body.classList.toggle('compact-layout', command.enabled);
                localStorage.setItem('osito_layout_compact', command.enabled ? 'true' : 'false');
                const checkbox = getEl('layout-compact');
                if (checkbox) checkbox.checked = command.enabled;
                return command.enabled ? 'He activado la vista compacta.' : 'He restaurado la vista normal.';
            }

            if (command.type === 'theme') {
                window.cambiarFondo?.(command.primary, command.secondary);
                const primary = getEl('picker-primario');
                const secondary = getEl('picker-secundario');
                if (primary) primary.value = command.primary;
                if (secondary) secondary.value = command.secondary;
                return 'He cambiado los colores de la pagina.';
            }

            if (command.type === 'advanced_animation') {
                window.toggleAdvancedAnimaciones?.();
                return 'He actualizado las animaciones avanzadas.';
            }

            if (command.type === 'promo') {
                if (typeof window.cambiarPromo === 'function') window.cambiarPromo(command.direction);
                return command.direction > 0 ? 'He avanzado al siguiente anuncio.' : 'He vuelto al anuncio anterior.';
            }

            if (command.type === 'latest') {
                this.openTab('videos');
                setTimeout(() => getEl('main-video-grid')?.querySelector('.video-card')?.click(), 400);
                return 'He abierto el video mas reciente.';
            }

            if (command.type === 'favorite') {
                const card = getEl('main-video-grid')?.querySelector('.video-card');
                const star = card?.querySelector('[onclick*="toggleFavorito"]');
                if (star) star.click();
                return star ? 'He actualizado el favorito del video visible.' : 'No hay un video visible para guardar.';
            }

            if (command.type === 'time') {
                return `En tu dispositivo son las ${new Date().toLocaleTimeString('es-SV', {
                    hour: 'numeric',
                    minute: '2-digit'
                })}.`;
            }

            if (command.type === 'playlists') {
                const playlists = await YouTubeService.listPlaylists();
                if (!playlists.length) {
                    return 'No pude leer las listas de reproduccion configuradas.';
                }
                const names = playlists.slice(0, 4).map((item) => item.title).join(', ');
                return `Estas son algunas listas disponibles: ${names}.`;
            }

            if (command.type === 'search') {
                showToast(`Buscando videos de ${command.query}...`);
                const results = await YouTubeService.searchVideos(command.query);
                this.openTab('videos');
                renderSearchResults(results, command.query);
                return results.length
                    ? `Encontré ${results.length} videos sobre ${command.query}.`
                    : `No encontré videos sobre ${command.query}.`;
            }

            if (command.type === 'greeting') {
                return this.pick([
                    'Que onda, aqui ando listo para ayudarte.',
                    'Hola, dime que necesitas y lo revisamos.',
                    'Buenas, tirame la pregunta y vamos paso a paso.'
                ]);
            }

            if (command.type === 'thanks') {
                return this.pick([
                    'Con gusto, para eso estoy.',
                    'De una, seguimos.',
                    'A la orden.'
                ]);
            }

            if (command.type === 'help') {
                return [
                    'Puedo abrir videos, directos, canciones, series, favoritos, el chat en vivo y el canal de YouTube.',
                    'Tambien puedo buscar videos por frase, consultar si hay directo y activar o desactivar rendimiento, animaciones y alertas.',
                    'Usa el boton del microfono dentro del panel de IA para hablar.'
                ].join(' ');
            }

            if (command.type === 'forward' || command.type === 'unknown') {
                const input = getEl('ai-input');
                const form = getEl('ai-form');
                if (input && form) {
                    input.value = command.text || rawText;
                    if (typeof form.requestSubmit === 'function') {
                        form.requestSubmit();
                    } else {
                        form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
                    }
                }
                // Igual que arriba: la respuesta real la habla el panel de IA
                // cuando procese la pregunta, para evitar que dos voces se
                // corten entre sí y no se escuche ninguna.
                return '';
            }

            return '';
        }

        openTab(tab) {
            const tabButton = getEl(`tab-btn-${tab}`);
            if (tabButton) {
                tabButton.click();
                return;
            }

            if (typeof window.cambiarPestaña === 'function') {
                window.cambiarPestaña(tab);
            }
        }

        runToggle(action) {
            if (typeof window[action] === 'function') {
                window[action]();
            }
        }

        runMusic(action, value) {
            const audio = getEl('bg-music');
            if (!audio) return 'No encontre la musica de fondo.';
            if (action === 'pause') {
                if (!audio.paused) window.toggleMusicaFondo?.();
                return 'He pausado la musica de fondo.';
            }
            if (action === 'play') {
                if (audio.paused) window.toggleMusicaFondo?.();
                return 'He reanudado la musica de fondo.';
            }
            if (action === 'toggle') {
                window.toggleMusicaFondo?.();
                return audio.paused ? 'He pausado la musica de fondo.' : 'He reproducido la musica de fondo.';
            }
            const current = Math.round(audio.volume * 100);
            const next = action === 'lower' ? Math.max(0, current - 10) : action === 'raise' ? Math.min(100, current + 10) : value;
            window.setMusicaVolumen?.(next);
            return `He dejado la musica al ${next} por ciento.`;
        }

        toggleResponse(action) {
            if (action === 'toggleModoUltra') return 'Actualicé el modo ultra.';
            if (action === 'toggleAnimaciones') return 'Actualicé las animaciones.';
            if (action === 'toggleAlertas') return 'Actualicé las notificaciones.';
            return 'He actualizado esa opcion.';
        }

        pick(options) {
            if (!options.length) return '';
            const index = Math.floor(Math.random() * options.length);
            return options[index];
        }

        async speak(text) {
            const message = String(text || '').trim();
            showToast(`Osito: ${message}`);

            if (!this.voiceOutputEnabled || !('speechSynthesis' in window)) {
                this.setState(State.IDLE, { label: DEFAULT_HINT, text: message });
                setStatusLabel(DEFAULT_HINT);
                return;
            }

            this.setState(State.SPEAKING, { label: message, text: message });
            setStatusLabel(message);

            if (window.OsitoVozHumana && typeof window.OsitoVozHumana.hablar === 'function') {
                await window.OsitoVozHumana.hablar(message);
                this.setState(State.IDLE, { label: DEFAULT_HINT, text: message });
                setStatusLabel(DEFAULT_HINT);
                return;
            }

            window.speechSynthesis.cancel();
            await new Promise((resolve) => {
                const utterance = new SpeechSynthesisUtterance(message);
                utterance.lang = 'es-MX';
                utterance.rate = 1.03;
                utterance.pitch = 1.05;
                const finish = () => {
                    this.setState(State.IDLE, { label: DEFAULT_HINT, text: message });
                    setStatusLabel(DEFAULT_HINT);
                    resolve();
                };
                utterance.onend = finish;
                utterance.onerror = finish;
                window.speechSynthesis.speak(utterance);
            });
        }
    }

    // =========================================================================
    // MOTOR DE VOZ NATURAL HUMANA (Asistente cálido, expresivo y no robótico)
    // =========================================================================
    const OsitoVozHumana = (function () {
        let mejorVozCache = null;
        let tokenHablaActual = 0;

        function esVozFemenina(v) {
            if (!v) return false;
            const name = String(v.name || '').toLowerCase();
            if (/sabina|dalia|elena|ximena|paulina|monica|mónica|marisol|angelica|angélica|francisca|catalina|elvira|paloma|lucia|lucía|carmen|raquel|laura|sofia|sofía|rosa|conchita|victoria|camila|mia|lola|female|mujer|femenin|chica|es-es-x-eed|es-us-x-sfb/i.test(name)) return true;
            if (/female/i.test(v.gender || '')) return true;
            return false;
        }

        function esVozMasculina(v) {
            if (!v) return false;
            const name = String(v.name || '').toLowerCase();
            if (/jorge|alonso|alvaro|álvaro|carlos|diego|enrique|pablo|raul|raúl|male|hombre|masculin|chico|es-es-x-eea/i.test(name)) return true;
            if (/male/i.test(v.gender || '')) return true;
            return false;
        }

        function puntuarVozEspanol(v) {
            if (!v) return -999;
            const lang = String(v.lang || '').toLowerCase();
            const name = String(v.name || '').toLowerCase();
            if (!lang.startsWith('es')) return -999;

            let pts = 0;
            // Prioridad máxima a voces femeninas (petición expresa del usuario)
            if (esVozFemenina(v)) pts += 350;
            else if (esVozMasculina(v)) pts -= 250;

            // Priorizar voces Neurales / Naturales / Online de alta calidad
            if (/natural|neural|online|wavenet|studio|premium|enhanced|siri/i.test(name)) pts += 140;
            if (/google\s*español|google\s*espanol|microsoft/i.test(name)) pts += 50;
            if (v.localService === false) pts += 30;

            // Preferir acento latinoamericano cálido o español claro
            if (/es[-_](mx|us|419|sv|co|cr|pa|pe|cl|ar)/i.test(lang)) pts += 40;
            else if (/es[-_](es)/i.test(lang)) pts += 25;

            // Penalizar sintetizadores robóticos antiguos
            if (/espeak|compact| robotic|android\s+tts\s+legacy/i.test(name)) pts -= 120;
            return pts;
        }

        function obtenerMejorVoz() {
            if (!('speechSynthesis' in window)) return null;
            const voces = window.speechSynthesis.getVoices() || [];
            if (!voces.length) return mejorVozCache;

            const voiceNameGuardada = localStorage.getItem('osito_ai_selected_voice_name') || '';
            if (voiceNameGuardada) {
                const encontrada = voces.find(v => v.name === voiceNameGuardada);
                if (encontrada) {
                    mejorVozCache = encontrada;
                    return mejorVozCache;
                }
            }

            let mejor = null;
            let maxPts = -999;
            for (let i = 0; i < voces.length; i++) {
                const p = puntuarVozEspanol(voces[i]);
                if (p > maxPts) {
                    maxPts = p;
                    mejor = voces[i];
                }
            }
            if (mejor && maxPts > -100) {
                mejorVozCache = mejor;
            }
            return mejorVozCache;
        }

        if ('speechSynthesis' in window) {
            obtenerMejorVoz();
            if (typeof window.speechSynthesis.addEventListener === 'function') {
                window.speechSynthesis.addEventListener('voiceschanged', obtenerMejorVoz);
            } else {
                window.speechSynthesis.onvoiceschanged = obtenerMejorVoz;
            }
        }

        function limpiarTextoParaAsistente(raw) {
            return String(raw || '')
                .replace(/https?:\/\/\S+/gi, '')
                .replace(/[*_~`#>|]/g, ' ')
                // Quitar emojis para que el motor de voz nunca lea sus nombres técnicos
                .replace(/[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE00}-\u{FE0F}]/gu, ' ')
                .replace(/[^\p{L}\p{N}\s.,;:!?¡¿"'-]/gu, ' ')
                .replace(/\s+/g, ' ')
                .trim();
        }

        function dividirEnFrasesNaturales(texto) {
            const limpio = limpiarTextoParaAsistente(texto);
            if (!limpio) return [];
            // Separar por signos de puntuación manteniendo la entonación (?, !, .)
            const partes = limpio.match(/[^.!?¡¿]+[.!?]+|[^.!?¡¿]+$/g) || [limpio];
            const frases = [];
            for (let p of partes) {
                const f = p.trim();
                if (!f) continue;
                // Si una oración es demasiado larga, dividir suavemente en comas o punto y coma para que respire natural
                if (f.length > 165 && /[,;:]/.test(f)) {
                    const sub = f.split(/(?<=[,;:])\s+/);
                    for (const s of sub) {
                        if (s.trim()) frases.push(s.trim());
                    }
                } else {
                    frases.push(f);
                }
            }
            return frases.length ? frases : [limpio];
        }

        function obtenerVelocidadBase() {
            const guardado = parseFloat(localStorage.getItem('osito_ai_voice_rate') || '1.0');
            return Number.isFinite(guardado) ? Math.min(1.3, Math.max(0.85, guardado)) : 1.0;
        }

        function hablar(texto, opciones = {}) {
            return new Promise((resolve) => {
                if (!('speechSynthesis' in window)) {
                    resolve();
                    return;
                }
                const frases = dividirEnFrasesNaturales(texto);
                if (!frases.length) {
                    resolve();
                    return;
                }

                const miToken = ++tokenHablaActual;
                try { window.speechSynthesis.cancel(); } catch (e) {}

                const voz = obtenerMejorVoz();
                const velBase = Number(opciones.rate) || obtenerVelocidadBase();
                let idx = 0;

                document.dispatchEvent(new CustomEvent('osito:tts-start'));

                const finalizarTodo = () => {
                    if (miToken === tokenHablaActual) {
                        document.dispatchEvent(new CustomEvent('osito:tts-end'));
                    }
                    resolve();
                };

                const hablarSiguiente = () => {
                    if (miToken !== tokenHablaActual) {
                        resolve();
                        return;
                    }
                    if (idx >= frases.length) {
                        finalizarTodo();
                        return;
                    }
                    const frase = frases[idx++];
                    const u = new SpeechSynthesisUtterance(frase);
                    if (voz) {
                        u.voice = voz;
                        u.lang = voz.lang || 'es-MX';
                    } else {
                        u.lang = 'es-MX';
                    }

                    // Entonación conversacional dinámica según el sentido de cada frase
                    const esPregunta = /[?¿]/.test(frase);
                    const esExclamacion = /[!¡]/.test(frase) || /^(hola|que onda|qué onda|buenas|claro|perfecto|genial|listo)/i.test(frase);

                    if (esPregunta) {
                        u.pitch = 1.09;
                        u.rate = Math.min(1.22, velBase * 1.03);
                    } else if (esExclamacion) {
                        u.pitch = 1.07;
                        u.rate = Math.min(1.22, velBase * 1.04);
                    } else {
                        u.pitch = 1.04;
                        u.rate = Math.min(1.2, velBase * 1.02);
                    }
                    u.volume = 1;

                    u.onend = () => {
                        if (miToken !== tokenHablaActual) {
                            resolve();
                            return;
                        }
                        if (idx < frases.length) {
                            setTimeout(hablarSiguiente, 55);
                        } else {
                            finalizarTodo();
                        }
                    };
                    u.onerror = () => {
                        if (miToken !== tokenHablaActual) {
                            resolve();
                            return;
                        }
                        if (idx < frases.length) {
                            setTimeout(hablarSiguiente, 40);
                        } else {
                            finalizarTodo();
                        }
                    };

                    try {
                        window.speechSynthesis.speak(u);
                    } catch (e) {
                        finalizarTodo();
                    }
                };

                hablarSiguiente();
            });
        }

        function cancelar() {
            tokenHablaActual += 1;
            if ('speechSynthesis' in window) {
                try { window.speechSynthesis.cancel(); } catch (e) {}
            }
            document.dispatchEvent(new CustomEvent('osito:tts-end'));
        }

        function poblarVocesDisponibles(selectEl) {
            if (!selectEl || !('speechSynthesis' in window)) return;
            const voces = window.speechSynthesis.getVoices() || [];
            const guardada = localStorage.getItem('osito_ai_selected_voice_name') || '';

            if (!voces.length) {
                // Si el navegador aún no expone las voces (típico en Chrome Android / primer arranque),
                // poblamos opciones de alta calidad inmediatas para que NUNCA quede en "Cargando..."
                selectEl.innerHTML = '';
                const opcionesInmediatas = [
                    { val: '', label: '⭐ Predeterminada (Femenina: Automática en Español)' },
                    { val: 'es-MX', label: '👩 Voz Femenina de México / Latino' },
                    { val: 'es-US', label: '👩 Voz Femenina de Estados Unidos' },
                    { val: 'es-ES', label: '👩 Voz Femenina de España' },
                    { val: 'es-419', label: '👩 Voz Femenina Latinoamericana' },
                    { val: 'es-MX-m', label: '👨 Voz Masculina de México / Latino' }
                ];
                opcionesInmediatas.forEach(item => {
                    const opt = document.createElement('option');
                    opt.value = item.val;
                    opt.textContent = item.label;
                    if (item.val === guardada) opt.selected = true;
                    selectEl.appendChild(opt);
                });

                // Programar reintentos activos en background
                if (!selectEl.__vocesPollerIniciado) {
                    selectEl.__vocesPollerIniciado = true;
                    [100, 300, 600, 1200, 2500, 4500].forEach(ms => {
                        setTimeout(() => {
                            const vocesNuevas = window.speechSynthesis.getVoices() || [];
                            if (vocesNuevas.length) {
                                poblarVocesDisponibles(selectEl);
                            }
                        }, ms);
                    });
                }
                return;
            }

            const espanolVoces = voces.filter(v => String(v.lang || '').toLowerCase().startsWith('es'));
            const lista = espanolVoces.length ? espanolVoces : voces;

            // Ordenar: voces de mayor puntuación (femeninas de calidad) primero
            lista.sort((a, b) => puntuarVozEspanol(b) - puntuarVozEspanol(a));

            const mejorVoz = obtenerMejorVoz();
            const nombreMejor = mejorVoz ? mejorVoz.name : '';

            selectEl.innerHTML = '';
            const optDefecto = document.createElement('option');
            optDefecto.value = '';
            optDefecto.textContent = `⭐ Predeterminada (Femenina: ${nombreMejor || 'Automática'})`;
            if (!guardada) optDefecto.selected = true;
            selectEl.appendChild(optDefecto);

            lista.forEach(v => {
                const opt = document.createElement('option');
                opt.value = v.name;
                const fem = esVozFemenina(v);
                const masc = esVozMasculina(v);
                const icono = fem ? '👩 ' : (masc ? '👨 ' : '🗣️ ');
                const tag = fem ? ' · Femenina' : (masc ? ' · Masculina' : '');
                opt.textContent = `${icono}${v.name} (${v.lang})${tag}`;
                if (v.name === guardada) opt.selected = true;
                selectEl.appendChild(opt);
            });
        }

        return {
            hablar,
            cancelar,
            obtenerMejorVoz,
            limpiarTextoParaAsistente,
            poblarVocesDisponibles
        };
    }());

    window.OsitoVozHumana = OsitoVozHumana;

    function setupUI(assistant) {
        const mic = getEl('ai-mic-btn');
        const status = getEl('ai-voice-status');
        const badge = getEl('voice-assistant-badge');
        const badgeLabel = getEl('voice-status-label');
        const voiceToggle = getEl('ai-voice-toggle');

        if (mic) {
            mic.addEventListener('click', () => {
                if (esModoInvitado()) {
                    showToast('¡Inicia sesión o crea una cuenta para usar el micrófono! 🎙️✨');
                    return;
                }
                assistant.toggle();
            });
        }

        if (voiceToggle) {
            voiceToggle.addEventListener('click', () => assistant.toggleVoiceOutput());
        }

        if (badge) {
            badge.addEventListener('click', () => {
                assistant.openPanel();
                focusMicButton();
            });
        }

        document.addEventListener('voiceassistant:state', ({ detail }) => {
            const active = detail.state !== State.IDLE;
            const form = getEl('ai-form');
            const panel = getEl('ai-section');
            mic?.classList.toggle('listening', detail.state === State.LISTENING);
            mic?.classList.toggle('processing', detail.state === State.PROCESSING);
            mic?.classList.toggle('speaking', detail.state === State.SPEAKING);
            form?.classList.toggle('mic-listening-active', detail.state === State.LISTENING);
            form?.classList.toggle('mic-processing-active', detail.state === State.PROCESSING);
            panel?.classList.toggle('ia-panel-listening', detail.state === State.LISTENING);
            mic?.setAttribute('aria-pressed', detail.state === State.LISTENING ? 'true' : 'false');
            mic?.setAttribute('title', detail.state === State.LISTENING ? 'Detener escucha' : 'Pulsar para hablar');
            if (status) status.textContent = detail.label || DEFAULT_HINT;
            badge?.classList.toggle('active', active);
            badge?.classList.toggle('listening', detail.state === State.LISTENING);
            if (badgeLabel) badgeLabel.textContent = detail.state === State.LISTENING ? 'Escuchando...' : 'La mascotita del Sotano';
        });

        setStatusLabel(DEFAULT_HINT);
    }

    window.VoiceAssistantCore = {
        State,
        normalize,
        detectIntent,
        YouTubeService,
        PushToTalkAssistant
    };

    window.activarAsistenteVozPorBoton = function activarAsistenteVozPorBoton() {
        if (window.voiceAssistant?.openPanel) {
            window.voiceAssistant.openPanel();
        } else {
            openAIPanel();
        }
        focusMicButton();
    };

    window.addEventListener('DOMContentLoaded', () => {
        const assistant = new PushToTalkAssistant();
        setupUI(assistant);
        window.voiceAssistant = assistant;
        YouTubeService.checkLive().catch(() => {});
    });
}());
