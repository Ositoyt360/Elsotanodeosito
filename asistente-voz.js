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
    const DEFAULT_HINT = 'Pulsa el microfono para hablar';
    const CHANNEL_NAME = 'OsitoYT360';
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
        window.open(url, '_blank', 'noopener');
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

    class PushToTalkAssistant {
        constructor() {
            this.state = State.IDLE;
            this.recognition = null;
            this.isListening = false;
            this.voiceOutputEnabled = localStorage.getItem('osito_ai_voz') !== 'false';
            this.pendingSpeech = null;
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
            this.recognition.lang = 'es-SV';
            this.recognition.continuous = false;
            this.recognition.interimResults = false;
            this.recognition.maxAlternatives = 1;

            this.recognition.onstart = () => {
                this.isListening = true;
                this.setState(State.LISTENING, { label: 'Escuchando... habla ahora' });
            };

            this.recognition.onresult = (event) => {
                const transcript = Array.from(event.results)
                    .map((result) => result[0].transcript)
                    .join(' ')
                    .trim();

                if (transcript) {
                    this.process(transcript);
                }
            };

            this.recognition.onerror = (event) => {
                this.isListening = false;
                const label = event.error === 'not-allowed'
                    ? 'Permiso de microfono denegado'
                    : DEFAULT_HINT;
                this.setState(State.ERROR, { label, error: event.error });
                setStatusLabel(label);
                if (event.error === 'not-allowed') {
                    showToast('Concede permiso al microfono para usar el asistente.');
                }
            };

            this.recognition.onend = () => {
                this.isListening = false;
                if (this.state === State.LISTENING) {
                    this.setState(State.IDLE, { label: DEFAULT_HINT });
                }
                setStatusLabel(DEFAULT_HINT);
            };
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
                return;
            }

            if (this.isListening) {
                this.recognition?.stop();
                return;
            }

            if (!this.recognition) {
                showToast('Este navegador no admite reconocimiento de voz.');
                return;
            }

            try {
                this.recognition.start();
            } catch (error) {
                console.warn('[VoiceAssistant]', error);
            }
        }

        async process(rawText) {
            this.recognition?.stop();
            this.setState(State.PROCESSING, { label: 'Procesando...', text: rawText });
            setStatusLabel('Procesando...');
            document.dispatchEvent(new CustomEvent('voiceassistant:recognized', { detail: { text: rawText } }));

            const command = detectIntent(rawText);
            let response = '';

            try {
                response = await this.executeCommand(command, rawText);
            } catch (error) {
                console.error('[VoiceAssistant]', error);
                response = 'No pude completar esa accion. Revisa la conexion con YouTube.';
            }

            await this.speak(response);
        }

        async executeCommand(command, rawText) {
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

            if (command.type === 'forward') {
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
                return 'Envié tu consulta al panel de inteligencia.';
            }

            return 'No entendi esa orden. Prueba con otra frase.';
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
            window.speechSynthesis.cancel();

            await new Promise((resolve) => {
                const utterance = new SpeechSynthesisUtterance(message);
                utterance.lang = 'es-419';
                utterance.rate = 1;
                utterance.pitch = 1;
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

    function setupUI(assistant) {
        const mic = getEl('ai-mic-btn');
        const status = getEl('ai-voice-status');
        const badge = getEl('voice-assistant-badge');
        const badgeLabel = getEl('voice-status-label');
        const voiceToggle = getEl('ai-voice-toggle');

        if (mic) {
            mic.addEventListener('click', () => assistant.toggle());
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
            mic?.classList.toggle('listening', detail.state === State.LISTENING);
            mic?.classList.toggle('processing', detail.state === State.PROCESSING);
            mic?.classList.toggle('speaking', detail.state === State.SPEAKING);
            mic?.setAttribute('aria-pressed', detail.state === State.LISTENING ? 'true' : 'false');
            mic?.setAttribute('title', detail.state === State.LISTENING ? 'Detener escucha' : 'Pulsar para hablar');
            if (status) status.textContent = detail.label || DEFAULT_HINT;
            badge?.classList.toggle('active', active);
            badge?.classList.toggle('listening', detail.state === State.LISTENING);
            if (badgeLabel) badgeLabel.textContent = detail.state === State.LISTENING ? 'Escuchando...' : 'Asistente IA';
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
