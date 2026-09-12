/**
 * BASE DE CONOCIMIENTO Y MOTOR INTELIGENTE DE LA IA - EL SÓTANO DE OSITO
 *
 * Incluye las 19 preguntas y respuestas oficiales, datos extras,
 * reconocimiento de preguntas similares con tolerancia a errores ortográficos,
 * sinónimos y lenguaje informal, detección de hora y ubicación local del usuario,
 * y límite de 5 preguntas para el modo invitado.
 */

(function (global) {
    'use strict';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BASE DE CONOCIMIENTO OFICIAL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const BASE_CONOCIMIENTO = [
        {
            id: 1,
            pregunta: '¿Cuándo empezaste a interesarte por YouTube?',
            respuesta: 'Empecé a interesarme por YouTube aproximadamente en 2019, cuando de niño veía videos de un creador llamado Maxwhish. Él me inspiró.',
            variaciones: [
                '¿Cuándo empezaste a interesarte por YouTube?',
                '¿Cuándo comenzaste con YouTube?',
                '¿Desde cuándo te gusta YouTube?',
                '¿Quién te inspiró?',
                '¿Cuándo empezaste a querer ser youtuber?',
                '¿Desde cuándo haces contenido?',
                '¿Por qué empezaste en YouTube?',
                '¿Quién fue tu inspiración?',
                '¿De dónde vino tu inspiración para YouTube?'
            ],
            keywords: ['interesarte', 'interesar', 'youtube', '2019', 'maxwhish', 'inspiro', 'inspiracion', 'comenzaste', 'empezaste', 'querer ser youtuber', 'haces contenido']
        },
        {
            id: 2,
            pregunta: '¿Cómo se llamaba tu primer canal?',
            respuesta: '“Momentos Divertidos con OsitoGamer”.',
            variaciones: [
                '¿Cómo se llamaba tu primer canal?',
                '¿Cuál fue tu primer canal?',
                '¿Cómo se llamaba tu canal original?',
                '¿Cuál era tu primer canal de YouTube?',
                '¿Cómo se llamaba tu canal antes de OsitoYT360?',
                '¿Cuál fue tu canal anterior?',
                '¿Nombre de tu primer canal?'
            ],
            keywords: ['primer canal', 'canal original', 'canal antes de ositoyt360', 'nombre primer canal', 'momentos divertidos con ositogamer']
        },
        {
            id: 3,
            pregunta: '¿Cuál fue tu primer video?',
            respuesta: '“Episodio 1 temporada 1 Las Perrerías de Mike”. (Algunos videos anteriores pudieron ser borrados, por lo que este es el primero registrado).',
            variaciones: [
                '¿Cuál fue tu primer video?',
                '¿Qué video subiste primero?',
                '¿Cómo se llamaba tu primer video?',
                '¿Cuál fue tu primer video de YouTube?',
                '¿Qué video hiciste al principio?',
                '¿Primer video del canal?',
                '¿Nombre de tu primer video?'
            ],
            keywords: ['primer video', 'video primero', 'subiste primero', 'primer video youtube', 'hiciste al principio', 'perrerias de mike']
        },
        {
            id: 4,
            pregunta: '¿Por qué no muestras tu cara?',
            respuesta: 'No me gusta enseñar mi cara porque tengo inseguridades.',
            variaciones: [
                '¿Por qué no muestras tu cara?',
                '¿Por qué no enseñas tu rostro?',
                '¿Por qué no haces face reveal?',
                '¿Vas a mostrar tu cara?',
                '¿Harás face reveal?',
                '¿Por qué ocultas tu cara?',
                '¿Algún día mostrarás tu cara?',
                '¿Cuándo vas a mostrar tu cara?',
                '¿Por qué te tapas la cara?'
            ],
            keywords: ['mostrar cara', 'ensenar cara', 'rostro', 'face reveal', 'ocultas cara', 'inseguridades', 'tapas la cara', 'no muestras']
        },
        {
            id: 5,
            pregunta: '¿Cuáles son tus juegos favoritos para grabar?',
            respuesta: 'Minecraft y Roblox.',
            variaciones: [
                '¿Cuáles son tus juegos favoritos para grabar?',
                '¿Cuál es tu juego favorito?',
                '¿Qué juegos te gusta grabar?',
                '¿Qué juegos haces en tu canal?',
                '¿También juegas Roblox?',
                '¿Te gusta Minecraft?',
                '¿Qué videojuegos juegas para tus videos?'
            ],
            keywords: ['juegos favoritos', 'juego favorito', 'juegos grabar', 'grabar juegos', 'juegas roblox', 'gusta minecraft', 'juegos canal']
        },
        {
            id: 6,
            pregunta: '¿Qué es lo que más te gusta de crear contenido?',
            respuesta: 'Jugar Minecraft, hablar con la comunidad y editar.',
            variaciones: [
                '¿Qué es lo que más te gusta de crear contenido?',
                '¿Qué disfrutas de hacer videos?',
                '¿Qué parte de crear contenido te gusta?',
                '¿Qué te gusta hacer como creador?',
                '¿Qué disfrutas siendo youtuber?',
                '¿Qué es lo mejor de hacer videos?'
            ],
            keywords: ['mas te gusta crear contenido', 'disfrutas hacer videos', 'parte crear contenido', 'como creador', 'disfrutas siendo youtuber', 'hablar con la comunidad', 'editar']
        },
        {
            id: 7,
            pregunta: '¿Cuál es tu sueño con YouTube?',
            respuesta: 'Mi sueño es ser el youtuber más grande de Centroamérica. Y si no puedo lograrlo, tengo otra meta personal.',
            variaciones: [
                '¿Cuál es tu sueño con YouTube?',
                '¿Cuál es tu meta como youtuber?',
                '¿Cuál es tu mayor sueño?',
                '¿Qué quieres lograr con YouTube?',
                '¿Hasta dónde quieres llegar?',
                '¿Qué quieres conseguir con tu canal?',
                '¿Tu mayor meta en YouTube?'
            ],
            keywords: ['sueno con youtube', 'meta como youtuber', 'mayor sueno', 'lograr con youtube', 'hasta donde quieres llegar', 'conseguir con tu canal', 'centroamerica', 'youtuber mas grande']
        },
        {
            id: 8,
            pregunta: '¿Cuándo fue tu primer video en tu primer canal?',
            respuesta: 'Fue el 22 de octubre de 2021.',
            variaciones: [
                '¿Cuándo fue tu primer video en tu primer canal?',
                '¿Cuándo empezaste en YouTube?',
                '¿Qué día comenzaste?',
                '¿Cuál es la fecha de tu primer video?',
                '¿Cuándo subiste tu primer video?',
                '¿En qué fecha comenzaste?',
                '¿Fecha exacta de tu primer video?'
            ],
            keywords: ['fecha primer video', 'cuando primer video primer canal', 'dia comenzaste', 'fecha comenzaste', 'cuando subiste primer video', '22 de octubre', '2021']
        },
        {
            id: 9,
            pregunta: '¿Por qué elegiste el nombre OsitoGamer360?',
            respuesta: 'De niño tenía un Nintendo y grababa videos como si estuviera haciendo vlogs, pero no los subía a YouTube. Usaba un peluche de panda en vez de mostrar mi cara. Después me fueron gustando los videojuegos y de ahí nació OsitoGamer360.',
            variaciones: [
                '¿Por qué elegiste el nombre OsitoGamer360?',
                '¿De dónde salió OsitoGamer360?',
                '¿Por qué te llamas OsitoGamer360?',
                '¿Qué significa OsitoGamer360?',
                '¿Cómo nació ese nombre?',
                '¿Por qué elegiste ese nombre?',
                '¿Por qué te pusiste OsitoGamer360?'
            ],
            keywords: ['elegiste el nombre', 'salio ositogamer360', 'llamas ositogamer360', 'significa ositogamer360', 'nacio ese nombre', 'peluche panda', 'nintendo', 'origen nombre']
        },
        {
            id: 10,
            pregunta: '¿Cuál es tu video favorito?',
            respuesta: 'Mi video favorito es “Osito Expo 2026”.',
            variaciones: [
                '¿Cuál es tu video favorito?',
                '¿Qué video te gusta más?',
                '¿Cuál es tu video preferido?',
                '¿Cuál es tu video favorito del canal?',
                '¿Qué video te gusta más de todos?'
            ],
            keywords: ['video favorito', 'video preferido', 'video te gusta mas', 'video favorito del canal']
        },
        {
            id: 11,
            pregunta: '¿Cuál ha sido el video más difícil de editar?',
            respuesta: '“Osito Expo 2026”.',
            variaciones: [
                '¿Cuál ha sido el video más difícil de editar?',
                '¿Qué video te costó más editar?',
                '¿Cuál fue tu edición más difícil?',
                '¿Qué video te dio más trabajo?',
                '¿Cuál fue el proyecto más difícil de editar?'
            ],
            keywords: ['mas dificil de editar', 'costo mas editar', 'edicion mas dificil', 'dio mas trabajo editar', 'proyecto mas dificil editar']
        },
        {
            id: 12,
            pregunta: '¿Qué es lo que más disfrutas hacer?',
            respuesta: 'Jugar.',
            variaciones: [
                '¿Qué es lo que más disfrutas hacer?',
                '¿Qué te gusta hacer más?',
                '¿Qué disfrutas más?',
                '¿Cuál es tu actividad favorita?',
                '¿Qué haces cuando quieres divertirte?'
            ],
            keywords: ['mas disfrutas hacer', 'te gusta hacer mas', 'disfrutas mas', 'actividad favorita', 'quieres divertirte', 'para divertirte']
        },
        {
            id: 13,
            pregunta: '¿Qué quieres mejorar en tus videos?',
            respuesta: 'La edición, las miniaturas y mi voz, y también quiero mejorar para no trabarme al hablar.',
            variaciones: [
                '¿Qué quieres mejorar en tus videos?',
                '¿Qué quieres mejorar de tu canal?',
                '¿Qué quieres mejorar como creador?',
                '¿Qué aspectos quieres mejorar?',
                '¿Quieres mejorar tu edición?',
                '¿Quieres mejorar tus miniaturas?',
                '¿Quieres mejorar tu voz?',
                '¿En qué quieres mejorar?'
            ],
            keywords: ['quieres mejorar', 'mejorar videos', 'mejorar canal', 'mejorar creador', 'mejorar edicion', 'mejorar miniaturas', 'mejorar voz', 'trabarme al hablar']
        },
        {
            id: 14,
            pregunta: '¿Qué les gusta a tus seguidores?',
            respuesta: 'A mis seguidores les gustan BedWars, Craftsman, Roblox y las series de survival de Minecraft.',
            variaciones: [
                '¿Qué les gusta a tus seguidores?',
                '¿Qué contenido le gusta a tu comunidad?',
                '¿Qué juegos prefieren tus seguidores?',
                '¿Qué quieren ver tus seguidores?',
                '¿Cuáles son los juegos favoritos de tu comunidad?',
                '¿Qué contenido disfruta más tu comunidad?'
            ],
            keywords: ['gusta a tus seguidores', 'gusta a tu comunidad', 'prefieren tus seguidores', 'quieren ver tus seguidores', 'favoritos de tu comunidad', 'disfruta tu comunidad']
        },
        {
            id: 15,
            pregunta: '¿Vas a volver a hacer directos?',
            respuesta: 'Sí, voy a volver a hacer directos, pero por el momento no tengo un horario fijo porque todavía me estoy organizando.',
            variaciones: [
                '¿Vas a volver a hacer directos?',
                '¿Volverás a hacer streams?',
                '¿Harás directos otra vez?',
                '¿Vas a regresar a los livestreams?',
                '¿Cuándo volverán los directos?',
                '¿Tendrás transmisiones en vivo?',
                '¿Cuándo harás en vivo?'
            ],
            keywords: ['volver a hacer directos', 'volveras a hacer streams', 'directos otra vez', 'regresar livestreams', 'cuando volveran directos', 'transmisiones en vivo', 'horario directos']
        },
        {
            id: 16,
            pregunta: '¿Tienes planeado algún evento grande?',
            respuesta: 'Por el momento no tengo planeado un evento grande.',
            variaciones: [
                '¿Tienes planeado algún evento grande?',
                '¿Vas a hacer algún evento?',
                '¿Habrá un evento grande?',
                '¿Tienes algún evento preparado?',
                '¿Harás otro evento?',
                '¿Tienes algún proyecto grande?'
            ],
            keywords: ['evento grande', 'planeado evento', 'habra evento', 'evento preparado', 'haras otro evento', 'proyecto grande']
        },
        {
            id: 17,
            pregunta: '¿Qué planes tienes para Craftsman?',
            respuesta: 'En el futuro quiero revivir la comunidad de Craftsman y revivir un servidor de BedWars.',
            variaciones: [
                '¿Qué planes tienes para Craftsman?',
                '¿Qué quieres hacer con Craftsman?',
                '¿Vas a volver a Craftsman?',
                '¿Tienes proyectos para Craftsman?',
                '¿Quieres revivir Craftsman?',
                '¿Vas a revivir la comunidad de Craftsman?',
                '¿Qué planes tienes para BedWars?'
            ],
            keywords: ['planes craftsman', 'quieres hacer craftsman', 'volver a craftsman', 'proyectos craftsman', 'revivir craftsman', 'revivir comunidad craftsman', 'planes bedwars']
        },
        {
            id: 18,
            pregunta: '¿Por qué quieres revivir la comunidad de Craftsman?',
            respuesta: 'Porque últimamente esos servidores están muy apagados. Antes estaban llenísimos y era muy nostálgico poder jugar con personas, tener muchos amigos y charlar dentro del juego sin necesidad de salir de él.',
            variaciones: [
                '¿Por qué quieres revivir la comunidad de Craftsman?',
                '¿Por qué quieres revivir Craftsman?',
                '¿Por qué quieres volver a esa comunidad?',
                '¿Qué te motivó a revivirla?',
                '¿Por qué quieres recuperar esos servidores?',
                '¿Qué tiene de especial esa comunidad?',
                '¿Por qué te da nostalgia Craftsman?'
            ],
            keywords: ['por que revivir craftsman', 'por que revivir comunidad', 'motivo revivirla', 'recuperar servidores craftsman', 'especial comunidad', 'nostalgia craftsman', 'servidores apagados']
        },
        {
            id: 19,
            pregunta: '¿Qué quieres recuperar de los antiguos servidores?',
            respuesta: 'Los mapas de esos años, especialmente esos mapas antiguos que son muy nostálgicos.',
            variaciones: [
                '¿Qué quieres recuperar de los antiguos servidores?',
                '¿Qué quieres traer de vuelta?',
                '¿Qué extrañas de esos servidores?',
                '¿Qué era lo más nostálgico?',
                '¿Qué quieres recuperar de esa época?',
                '¿Qué mapas quieres volver a ver?'
            ],
            keywords: ['recuperar antiguos servidores', 'traer de vuelta', 'extranas servidores', 'mas nostalgico', 'recuperar epoca', 'mapas antiguos', 'mapas volver a ver']
        }
    ];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // INFORMACIÓN EXTRA OFICIAL
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const INFORMACION_EXTRA = {
        canciones: 'Voy a sacar canciones, pero no seguidamente; las sacaré de vez en cuando.',
        expo2026: 'Se viene Osito Expo 2026 muy pronto.',
        craftsmanFuturo: 'Craftsman y BedWars son planes para el futuro.',
        directosHorario: 'Los directos volverán, pero todavía no tienen horario fijo.'
    };

    // Mensajes para respuestas no encontradas en la base (NO INVENTAR INFORMACIÓN)
    const MENSAJES_NO_DISPONIBLE = [
        'Esa información todavía no está disponible en la base de datos y podría agregarse en el futuro.',
        'Por el momento esa información no está disponible en la base de datos, pero podría agregarse en el futuro.',
        'Ese dato todavía no está registrado en la base de conocimiento y podría agregarse más adelante.'
    ];

    // Mensajes variados cuando el invitado alcanza el límite de 5 preguntas
    const MENSAJES_LIMITE_INVITADO = [
        'Has alcanzado el límite de 5 preguntas en modo invitado. ¡Regístrate o inicia sesión para seguir conversando con la IA sin límites!',
        'Llegaste al límite de 5 preguntas permitidas para invitados. Inicia sesión o crea tu cuenta para continuar usando la IA.',
        'Has completado tus 5 preguntas de prueba como invitado. Para seguir preguntando lo que quieras, por favor inicia sesión o regístrate en El Sótano de Osito.',
        'Se agotó el límite de 5 preguntas del modo invitado. ¡Únete a la comunidad iniciando sesión o registrándote para desbloquear acceso ilimitado!'
    ];

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // NORMALIZACIÓN Y PREPROCESAMIENTO DE TEXTO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function normalizarTexto(texto) {
        if (!texto) return '';
        let limpio = String(texto)
            .toLowerCase()
            .normalize('NFD')
            .replace(/[\u0300-\u036f]/g, '') // Quita tildes y diacríticos
            .replace(/[^a-z0-9ñ\s]/g, ' ') // Solo letras, números y espacios
            .replace(/\s+/g, ' ')
            .trim();

        // Expansión de abreviaciones comunes y jerga
        const palabras = limpio.split(' ').map(palabra => {
            if (palabra === 'q' || palabra === 'k') return 'que';
            if (palabra === 'xq' || palabra === 'pq') return 'porque';
            if (palabra === 'tmb' || palabra === 'tb') return 'tambien';
            if (palabra === 'd') return 'de';
            if (palabra === 'pa') return 'para';
            if (palabra === 'yt') return 'youtube';
            if (palabra === 'vid') return 'video';
            if (palabra === 'stream' || palabra === 'streamer') return 'directo';
            if (palabra === 'craftman' || palabra === 'crafman' || palabra === 'kraftsman') return 'craftsman';
            if (palabra === 'bedwar') return 'bedwars';
            if (palabra === 'feis' && limpio.includes('ribil')) return 'face';
            if (palabra === 'ribil') return 'reveal';
            return palabra;
        });

        return palabras.join(' ');
    }

    // Simplificación fonética básica para tolerancia a errores ortográficos en español
    function simplificarFonetica(texto) {
        let t = normalizarTexto(texto);
        // Reducir letras repetidas consecutivas (ej: hooolaaa -> hola, sii -> si)
        t = t.replace(/(.)\1+/g, '$1');
        // Cambios fonéticos habituales en español
        t = t.replace(/v/g, 'b');
        t = t.replace(/z/g, 's');
        t = t.replace(/c(?=[ei])/g, 's');
        t = t.replace(/qu(?=[ei])/g, 'k');
        t = t.replace(/c(?=[aou])/g, 'k');
        t = t.replace(/ll/g, 'y');
        t = t.replace(/h/g, ''); // h muda
        return t.trim();
    }

    // Coeficiente de similitud Dice basado en bigramas
    function calcularSimilitudBigramas(str1, str2) {
        if (!str1 || !str2) return 0;
        if (str1 === str2) return 1;
        const s1 = str1.replace(/\s+/g, '');
        const s2 = str2.replace(/\s+/g, '');
        if (s1.length < 2 || s2.length < 2) return s1 === s2 ? 1 : 0;

        const bg1 = new Map();
        for (let i = 0; i < s1.length - 1; i++) {
            const bg = s1.slice(i, i + 2);
            bg1.set(bg, (bg1.get(bg) || 0) + 1);
        }

        let interseccion = 0;
        for (let i = 0; i < s2.length - 1; i++) {
            const bg = s2.slice(i, i + 2);
            const count = bg1.get(bg) || 0;
            if (count > 0) {
                interseccion++;
                bg1.set(bg, count - 1);
            }
        }

        const total = (s1.length - 1) + (s2.length - 1);
        return (2 * interseccion) / total;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MOTOR DE BÚSQUEDA Y COINCIDENCIA EN LA BASE
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function buscarEnBaseConocimiento(preguntaUsuario) {
        const normUsuario = normalizarTexto(preguntaUsuario);
        const fonUsuario = simplificarFonetica(preguntaUsuario);

        if (!normUsuario) return null;

        // 1. REVISIÓN DE INTENCIONES ESPECÍFICAS / REGLAS DIRECTAS CON ALTA PRIORIDAD
        // =========================================================================

        // Item 4: Cara / Face reveal / Rostro
        if (/(face.*reveal|feis.*ribil|mostrar.*cara|ensenar.*cara|ocultas.*cara|tapas.*cara|tu.*rostro|ver.*tu.*cara|no.*muestras.*cara|no.*ensenas.*cara|algun.*dia.*cara)/.test(normUsuario) ||
            /(cara|rostro).*(inseguridad|mostrar|ensenar|ocultar|feis)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 4).respuesta;
        }

        // Item 11: Video más difícil de editar
        if (/(dificil|costo.*mas|dio.*mas.*trabajo|mas.*complicado).*(editar|edicion|proyecto)/.test(normUsuario) ||
            /(video|edicion).*(mas.*dificil|costo.*mas)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 11).respuesta;
        }

        // Item 10: Video favorito
        if (/(video.*favorito|video.*preferido|video.*te.*gusta.*mas|que.*video.*te.*gusta)/.test(normUsuario) &&
            !normUsuario.includes('dificil') && !normUsuario.includes('editar') && !normUsuario.includes('primer')) {
            return BASE_CONOCIMIENTO.find(i => i.id === 10).respuesta;
        }

        // Item 8: Fecha o día del primer video / cuándo empezaste en YouTube
        if (/(cuando.*(primer.*video|subiste.*primer|empezaste.*en.*youtube|comenzaste.*en.*youtube)|fecha.*(primer.*video|comenzaste|empezaste)|que.*dia.*comenzaste|en.*que.*fecha.*comenzaste)/.test(normUsuario) ||
            /22.*de.*octubre/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 8).respuesta;
        }

        // Item 2: Nombre del primer canal
        if (/(primer.*canal|canal.*original|canal.*antes.*de.*ositoyt360|nombre.*de.*tu.*primer.*canal|como.*se.*llamaba.*tu.*canal)/.test(normUsuario) ||
            /(como.*llamaba.*primer.*canal|cual.*fue.*tu.*primer.*canal)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 2).respuesta;
        }

        // Item 3: Cuál fue tu primer video (título/nombre del video, no fecha)
        if (/(cual.*fue.*tu.*primer.*video|que.*video.*subiste.*primero|como.*se.*llamaba.*tu.*primer.*video|primer.*video.*de.*youtube|que.*video.*hiciste.*al.*principio)/.test(normUsuario) ||
            /perrerias.*de.*mike/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 3).respuesta;
        }

        // Item 18: Por qué revivir Craftsman (motivo, nostalgia, servidores apagados)
        if (/(por.*que.*(revivir|volver).*craftsman|motivo.*revivir|por.*que.*recuperar.*servidores|que.*tiene.*de.*especial.*comunidad|nostalgia.*craftsman|servidores.*apagados)/.test(normUsuario) ||
            /(porque.*quieres.*revivir.*craftsman)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 18).respuesta;
        }

        // Item 19: Qué quieres recuperar de los antiguos servidores (mapas nostálgicos)
        if (/(recuperar.*(antiguos.*servidores|servidores|mapas|epoca)|traer.*de.*vuelta|extranas.*de.*esos.*servidores|mas.*nostalgico|mapas.*quieres.*volver.*a.*ver)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 19).respuesta;
        }

        // Item 17: Planes para Craftsman / BedWars (planes a futuro)
        if (/(planes.*(craftsman|bedwars)|quieres.*hacer.*con.*craftsman|vas.*a.*volver.*a.*craftsman|proyectos.*para.*craftsman|revivir.*craftsman|revivir.*comunidad.*craftsman)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 17).respuesta;
        }

        // Item 9: Por qué elegiste el nombre OsitoGamer360
        if (/(por.*que.*elegiste.*(nombre|ositogamer360)|de.*donde.*salio.*ositogamer360|por.*que.*te.*llamas.*ositogamer360|que.*significa.*ositogamer360|como.*nacio.*(ese.*)?nombre|peluche.*de.*panda)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 9).respuesta;
        }

        // Item 1: Cuándo empezaste a interesarte por YouTube / quién te inspiró
        if (/(cuando.*(interesarte|interesar).*youtube|desde.*cuando.*te.*gusta.*youtube|quien.*te.*inspiro|inspiracion|querer.*ser.*youtuber|desde.*cuando.*haces.*contenido|maxwhish)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 1).respuesta;
        }

        // Item 7: Sueño / meta con YouTube
        if (/(sueno.*con.*youtube|meta.*como.*youtuber|mayor.*sueno|quieres.*lograr.*con.*youtube|hasta.*donde.*quieres.*llegar|conseguir.*con.*tu.*canal|centroamerica)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 7).respuesta;
        }

        // Item 13: Qué quieres mejorar en tus videos
        if (/(quieres.*mejorar|aspectos.*mejorar|mejorar.*(edicion|miniaturas|voz|canal|hablar|videos)|trabarme.*al.*hablar)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 13).respuesta;
        }

        // Item 14: Qué les gusta a tus seguidores
        if (/(les.*gusta.*a.*tus.*seguidores|contenido.*le.*gusta.*a.*tu.*comunidad|juegos.*prefieren.*tus.*seguidores|quieren.*ver.*tus.*seguidores|favoritos.*de.*tu.*comunidad|contenido.*disfruta.*comunidad)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 14).respuesta;
        }

        // Item 15: Vas a volver a hacer directos
        if (/(volver.*a.*hacer.*directos|volveras.*a.*hacer.*streams|directos.*otra.*vez|regresar.*a.*los.*livestreams|cuando.*volveran.*los.*directos|tendras.*transmisiones.*en.*vivo|horario.*directos)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 15).respuesta;
        }

        // Item 16: Evento grande planeado
        if (/(evento.*grande|planeado.*algun.*evento|habra.*un.*evento.*grande|evento.*preparado|haras.*otro.*evento|proyecto.*grande)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 16).respuesta;
        }

        // Item 5: Juegos favoritos para grabar (Minecraft y Roblox)
        if (/(juegos.*favoritos.*grabar|juego.*favorito|juegos.*te.*gusta.*grabar|juegos.*haces.*en.*tu.*canal|tambien.*juegas.*roblox|te.*gusta.*minecraft)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 5).respuesta;
        }

        // Item 6: Qué te gusta más de crear contenido (distinto de jugar en general)
        if (/(mas.*te.*gusta.*de.*crear.*contenido|disfrutas.*de.*hacer.*videos|parte.*de.*crear.*contenido|te.*gusta.*hacer.*como.*creador|disfrutas.*siendo.*youtuber)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 6).respuesta;
        }

        // Item 12: Qué es lo que más disfrutas hacer (actividad general: Jugar)
        if (/(mas.*disfrutas.*hacer|te.*gusta.*hacer.*mas|disfrutas.*mas|(actividad|pasatiempo|hobby).*favorit|haces.*cuando.*quieres.*divertirte|para.*divertirte)/.test(normUsuario) &&
            !normUsuario.includes('crear') && !normUsuario.includes('video') && !normUsuario.includes('contenido') &&
            !normUsuario.includes('comida') && !normUsuario.includes('color') && !normUsuario.includes('pelicula') && !normUsuario.includes('cancion') && !normUsuario.includes('animal')) {
            return BASE_CONOCIMIENTO.find(i => i.id === 12).respuesta;
        }

        // Extras: Canciones
        if (/(sacar.*canciones|sacar.*musica|canciones.*en.*el.*futuro|habra.*mas.*canciones|vas.*a.*hacer.*canciones|cuando.*sacas.*canciones)/.test(normUsuario)) {
            return INFORMACION_EXTRA.canciones;
        }

        // Extras: Osito Expo 2026
        if (/(osito.*expo|expo.*2026)/.test(normUsuario)) {
            return INFORMACION_EXTRA.expo2026;
        }

        // 2. COINCIDENCIA POR SIMILITUD DE TEXTO Y BIGRAMAS CONTRA TODAS LAS VARIACIONES
        // =========================================================================
        let mejorCoincidencia = null;
        let mejorPuntaje = 0;

        for (const item of BASE_CONOCIMIENTO) {
            for (const variacion of item.variaciones) {
                const normVariacion = normalizarTexto(variacion);
                const fonVariacion = simplificarFonetica(variacion);

                const puntajeNorm = calcularSimilitudBigramas(normUsuario, normVariacion);
                const puntajeFon = calcularSimilitudBigramas(fonUsuario, fonVariacion);
                const puntaje = Math.max(puntajeNorm, puntajeFon);

                // Bono por coincidencia de palabras clave importantes
                let bonoKeywords = 0;
                let tieneKeyword = false;
                if (item.keywords) {
                    for (const kw of item.keywords) {
                        if (normUsuario.includes(normalizarTexto(kw))) {
                            bonoKeywords += 0.15;
                            tieneKeyword = true;
                        }
                    }
                }

                // Evitar falsos positivos en preguntas genéricas (ej: "¿cuál es tu comida favorita?")
                // que solo comparten palabras auxiliares pero no el tema central.
                if (!tieneKeyword && puntaje < 0.78) {
                    continue;
                }

                const puntajeTotal = puntaje + bonoKeywords;

                if (puntajeTotal > mejorPuntaje) {
                    mejorPuntaje = puntajeTotal;
                    mejorCoincidencia = item;
                }
            }
        }

        // Umbral de confianza exigente para evitar respuestas falsas/inventadas
        if (mejorCoincidencia && mejorPuntaje >= 0.60) {
            return mejorCoincidencia.respuesta;
        }

        return null;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BIENVENIDA POR VOZ Y HORA LOCAL DEL USUARIO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function obtenerInfoUbicacionUsuario() {
        const ahora = new Date();
        let hora = ahora.getHours();
        let zonaHoraria = '';
        let pais = '';

        try {
            zonaHoraria = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
        } catch (e) {
            zonaHoraria = '';
        }

        const mapaZonas = {
            'Europe/Madrid': 'España',
            'Atlantic/Canary': 'España',
            'America/Argentina': 'Argentina',
            'America/Buenos_Aires': 'Argentina',
            'America/Cordoba': 'Argentina',
            'America/Mexico_City': 'México',
            'America/Monterrey': 'México',
            'America/Tijuana': 'México',
            'America/Bogota': 'Colombia',
            'America/Santiago': 'Chile',
            'America/Lima': 'Perú',
            'America/El_Salvador': 'El Salvador',
            'America/Guatemala': 'Guatemala',
            'America/Tegucigalpa': 'Honduras',
            'America/Managua': 'Nicaragua',
            'America/Costa_Rica': 'Costa Rica',
            'America/Panama': 'Panamá',
            'America/Montevideo': 'Uruguay',
            'America/Asuncion': 'Paraguay',
            'America/Caracas': 'Venezuela',
            'America/La_Paz': 'Bolivia',
            'America/Guayaquil': 'Ecuador',
            'America/Santo_Domingo': 'República Dominicana',
            'America/Puerto_Rico': 'Puerto Rico',
            'America/Havana': 'Cuba',
            'America/New_York': 'Estados Unidos',
            'America/Chicago': 'Estados Unidos',
            'America/Los_Angeles': 'Estados Unidos'
        };

        if (zonaHoraria) {
            for (const [tzKey, pNombre] of Object.entries(mapaZonas)) {
                if (zonaHoraria.startsWith(tzKey)) {
                    pais = pNombre;
                    break;
                }
            }
        }

        if (!pais && typeof navigator !== 'undefined' && navigator.language) {
            const lang = navigator.language.toUpperCase();
            if (lang.includes('AR')) pais = 'Argentina';
            else if (lang.includes('ES')) pais = 'España';
            else if (lang.includes('MX')) pais = 'México';
            else if (lang.includes('CO')) pais = 'Colombia';
            else if (lang.includes('CL')) pais = 'Chile';
            else if (lang.includes('PE')) pais = 'Perú';
            else if (lang.includes('SV')) pais = 'El Salvador';
            else if (lang.includes('GT')) pais = 'Guatemala';
            else if (lang.includes('HN')) pais = 'Honduras';
            else if (lang.includes('NI')) pais = 'Nicaragua';
            else if (lang.includes('CR')) pais = 'Costa Rica';
            else if (lang.includes('PA')) pais = 'Panamá';
            else if (lang.includes('UY')) pais = 'Uruguay';
            else if (lang.includes('PY')) pais = 'Paraguay';
            else if (lang.includes('VE')) pais = 'Venezuela';
            else if (lang.includes('BO')) pais = 'Bolivia';
            else if (lang.includes('EC')) pais = 'Ecuador';
            else if (lang.includes('DO')) pais = 'República Dominicana';
        }

        // Obtener la hora local exacta según la zona horaria del usuario
        if (zonaHoraria) {
            try {
                const partes = new Intl.DateTimeFormat('en-US', {
                    timeZone: zonaHoraria,
                    hour: 'numeric',
                    hourCycle: 'h23'
                }).formatToParts(ahora);
                const parteHora = partes.find(p => p.type === 'hour');
                if (parteHora) {
                    hora = parseInt(parteHora.value, 10);
                }
            } catch (err) {}
        }

        // Saludo según la hora local: mañana, tarde o noche
        let saludo = 'Buenos días';
        if (hora >= 5 && hora < 12) {
            saludo = 'Buenos días';
        } else if (hora >= 12 && hora < 19) {
            saludo = 'Buenas tardes';
        } else {
            saludo = 'Buenas noches';
        }

        return {
            hora,
            saludo,
            zonaHoraria,
            pais
        };
    }

    function generarMensajeBienvenidaLocal(nombreUsuario) {
        const { saludo } = obtenerInfoUbicacionUsuario();
        const nombreLimpio = String(nombreUsuario || '').trim();
        const tieneNombre = Boolean(nombreLimpio && nombreLimpio !== 'Invitado');

        if (tieneNombre) {
            return `${saludo}, ${nombreLimpio}. Bienvenido a El Sótano de Osito. Aquí podrás ver videos, directos, canciones, guardar tus favoritos y preguntarme lo que quieras.`;
        }

        return `${saludo}. Bienvenido a El Sótano de Osito. Aquí podrás ver videos, directos, canciones, guardar tus favoritos y preguntarme lo que quieras.`;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // EXPORTACIÓN A WINDOW O MÓDULO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const OsitoConocimiento = {
        BASE_CONOCIMIENTO,
        INFORMACION_EXTRA,
        MENSAJES_NO_DISPONIBLE,
        MENSAJES_LIMITE_INVITADO,
        normalizarTexto,
        simplificarFonetica,
        calcularSimilitudBigramas,
        buscarEnBaseConocimiento,
        obtenerInfoUbicacionUsuario,
        generarMensajeBienvenidaLocal
    };

    if (typeof module !== 'undefined' && module.exports) {
        module.exports = OsitoConocimiento;
    }

    if (typeof global !== 'undefined') {
        global.OsitoConocimiento = OsitoConocimiento;
    }
})(typeof window !== 'undefined' ? window : globalThis);
