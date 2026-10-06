/**
 * BASE DE CONOCIMIENTO Y MOTOR INTELIGENTE DE LA IA - EL SÓTANO DE OSITO
 *
 * Incluye las 19 preguntas y respuestas oficiales, datos extras e información
 * oficial del canal (como la edad de Osito, cumpleaños, aniversario del canal,
 * país, editor, colaborador, serie y reglas), reconocimiento preciso sin
 * confundir preguntas, detección de hora y ubicación local del usuario,
 * y límite de 5 preguntas para el modo invitado.
 */

(function (global) {
    'use strict';

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // INFORMACIÓN OFICIAL DEL CANAL Y DE OSITO
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    const INFO_CANAL = {
        canal: 'OsitoYT360',
        canalTexto: 'Osito Gamer 360 YouTube',
        primerCanal: 'Momentos Divertidos con OsitoGamer',
        primerVideo: 'Episodio 1 temporada 1 Las Perrerías de Mike',
        fechaPrimerVideo: '22 de octubre de 2021',
        cumpleCanal: { mes: 5, dia: 2, anioInicio: 2022, fechaTexto: '2 de junio de 2022' },
        cumpleCreador: { mes: 8, dia: 28, anio: 2008, fechaTexto: '28 de septiembre de 2008' },
        pais: 'El Salvador',
        contenido: 'videojuegos de todo tipo, especialmente Minecraft, Roblox, Free Fire, Craftman/Craftsman, gameplays, directos, shorts, canciones y series',
        favoritos: 'Minecraft y Roblox',
        origen: 'De niño tenía un Nintendo y grababa videos como si estuviera haciendo vlogs en 2019, usando un peluche de panda en vez de mostrar su cara. De ahí nació OsitoGamer360.',
        inspiracion: 'Maxwhish (Max Wish), Los Compas y Mikecrack',
        editor: 'Santiago',
        serie: 'Survivalang',
        logro: 'llegar a 1000 suscriptores',
        videoFavorito: 'Osito Expo 2026',
        videoFavoritoExtra: 'un vlog armando el árbol de Navidad',
        videoMasDificil: 'Osito Expo 2026',
        colaborador: 'Allay MC',
        reglasDirectos: 'no insultos, no humillar a la gente y mantener todo humildemente',
        meta: 'terminar sus estudios, seguir con el canal y hacer crecer más la comunidad'
    };

    function calcularEdadCreador(fecha) {
        const hoy = fecha instanceof Date ? fecha : new Date();
        const nac = INFO_CANAL.cumpleCreador;
        let edad = hoy.getFullYear() - nac.anio;
        const yaCumplio = hoy.getMonth() > nac.mes || (hoy.getMonth() === nac.mes && hoy.getDate() >= nac.dia);
        if (!yaCumplio) edad -= 1;
        return edad;
    }

    function calcularAnosCanal(fecha) {
        const hoy = fecha instanceof Date ? fecha : new Date();
        const c = INFO_CANAL.cumpleCanal;
        let anos = hoy.getFullYear() - c.anioInicio;
        const yaCumplio = hoy.getMonth() > c.mes || (hoy.getMonth() === c.mes && hoy.getDate() >= c.dia);
        if (!yaCumplio) anos -= 1;
        return Math.max(0, anos);
    }

    function obtenerTiempoFaltaCanal(targetYears) {
        const ahora = new Date();
        const c = INFO_CANAL.cumpleCanal;
        const anosMeta = Number(targetYears) || (calcularAnosCanal(ahora) + 1);
        const anioMeta = c.anioInicio + anosMeta;
        const fechaObjetivo = new Date(anioMeta, c.mes, c.dia);
        if (ahora >= fechaObjetivo) {
            return `¡El canal ya cumplió los ${anosMeta} años en YouTube! 🎉`;
        }
        const diffMs = fechaObjetivo - ahora;
        const diffDiasTotal = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
        const meses = Math.floor(diffDiasTotal / 30.4375);
        const diasRestantes = Math.floor(diffDiasTotal % 30.4375);
        return `El aniversario del canal es el 2 de junio. Para cumplir ${anosMeta} años en YouTube (el 2 de junio de ${anioMeta}) faltan aproximadamente ${meses} meses y ${diasRestantes} días. 🎂`;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // BASE DE CONOCIMIENTO OFICIAL (19 PREGUNTAS INTACTAS)
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
            keywords: ['interesarte', 'interesar', '2019', 'maxwhish', 'inspiro', 'inspiracion', 'querer ser youtuber', 'haces contenido', 'gusta youtube']
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
            keywords: ['primer canal', 'canal original', 'canal antes de ositoyt360', 'canal anterior', 'nombre primer canal', 'momentos divertidos con ositogamer']
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
            keywords: ['cual fue tu primer video', 'que video subiste primero', 'como se llamaba tu primer video', 'primer video de youtube', 'hiciste al principio', 'perrerias de mike', 'nombre de tu primer video']
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
            keywords: ['mostrar cara', 'ensenar cara', 'ensenar rostro', 'face reveal', 'ocultas cara', 'inseguridades', 'tapas la cara', 'muestras tu cara']
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
            keywords: ['mas te gusta de crear contenido', 'disfrutas de hacer videos', 'parte de crear contenido', 'hacer como creador', 'disfrutas siendo youtuber', 'lo mejor de hacer videos']
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
            keywords: ['fecha primer video', 'cuando fue tu primer video', 'dia comenzaste', 'fecha comenzaste', 'cuando subiste tu primer video', '22 de octubre']
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
            keywords: ['elegiste el nombre', 'salio ositogamer360', 'llamas ositogamer360', 'significa ositogamer360', 'nacio ese nombre', 'peluche de panda', 'pusiste ositogamer360']
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
            keywords: ['mas dificil de editar', 'costo mas editar', 'edicion mas dificil', 'dio mas trabajo', 'proyecto mas dificil de editar']
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
            keywords: ['mas disfrutas hacer', 'te gusta hacer mas', 'que disfrutas mas', 'actividad favorita', 'quieres divertirte', 'para divertirte']
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
            keywords: ['quieres mejorar', 'mejorar en tus videos', 'mejorar de tu canal', 'mejorar como creador', 'mejorar tu edicion', 'mejorar tus miniaturas', 'mejorar tu voz', 'trabarme al hablar']
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
            keywords: ['gusta a tus seguidores', 'gusta a tu comunidad', 'prefieren tus seguidores', 'quieren ver tus seguidores', 'favoritos de tu comunidad', 'disfruta mas tu comunidad']
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
            keywords: ['volver a hacer directos', 'volveras a hacer streams', 'directos otra vez', 'regresar a los livestreams', 'cuando volveran los directos', 'transmisiones en vivo', 'horario directos']
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
            keywords: ['evento grande', 'planeado algun evento', 'habra un evento', 'evento preparado', 'haras otro evento', 'proyecto grande']
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
            keywords: ['planes tienes para craftsman', 'quieres hacer con craftsman', 'volver a craftsman', 'proyectos para craftsman', 'quieres revivir craftsman', 'revivir la comunidad de craftsman', 'planes tienes para bedwars']
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
            keywords: ['por que quieres revivir', 'porque quieres revivir', 'motivo a revivirla', 'por que quieres recuperar esos servidores', 'especial esa comunidad', 'nostalgia craftsman', 'servidores apagados']
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
            keywords: ['recuperar de los antiguos servidores', 'traer de vuelta', 'extranas de esos servidores', 'era lo mas nostalgico', 'recuperar de esa epoca', 'mapas quieres volver a ver']
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

    // Mensajes conversacionales variados para continuar la charla (nunca repite avisos de privacidad en preguntas normales)
    const MENSAJES_NO_DISPONIBLE = [
        '¡Claro que sí! Dime, ¿de qué te gustaría que platiquemos ahora? Podemos hablar de videojuegos, del canal OsitoYT360, de alguna tarea o de lo que tú quieras. 😊',
        '¡Va, me parece genial! Cuéntame más o dime qué tienes en mente: ¿jugamos a las adivinanzas, hablamos de Minecraft y Roblox, o resolvemos alguna duda? 🎮',
        '¡Te escucho! Sígueme contando o pregúntame lo que quieras sobre el canal, videojuegos, curiosidades, matemáticas o cualquier tema que te guste. 😄',
        '¡Perfecto! Aquí sigo contigo para platicar. ¿Qué te parece si hablamos de tu juego favorito o me cuentas qué estás haciendo hoy? ✨',
        '¡De una! Cuéntame qué más quieres saber o de qué tema tienes ganas de conversar ahorita. 🤖💬'
    ];

    // Filtro estricto: SOLO se activa cuando preguntan datos privados reales de la vida personal de Osito
    function esPreguntaPersonalPrivada(textoNorm) {
        if (!textoNorm) return false;
        return /\b(ubicacion exacta|direccion exacta|donde vive osito|donde vives exactamente|en que (ciudad|municipio|departamento|colonia|calle|casa|barrio) (vive|vives)|cual es (tu|su|el) (direccion|telefono|numero de telefono|celular|whatsapp|correo personal|apellido|nombre real|documento|dui)|dame (tu|su) (numero|telefono|whatsapp|celular|direccion)|apellido (completo|de osito|real)|como se llama osito en la vida real|nombre real de osito|en que (colegio|instituto|escuela|universidad) (estudia|estudias)|donde (estudia|estudias) osito|como se llaman (tus|sus) (padres|papas|hermanos|familiares)|tienes (novia|novio|pareja)|quien es (tu|su) (novia|novio|pareja|mama|papa))\b/.test(textoNorm);
    }

    const RESPUESTA_PRIVACIDAD = 'Por privacidad no comparto datos personales privados de Osito (como dirección exacta, teléfono, nombre real, familia o lugar de estudio), ¡pero pregúntame lo que quieras de cualquier otro tema, videojuegos o del canal y platicamos! 🛡️';

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

    // Quita saludos iniciales ("hola osito dime...", "buenas una pregunta...") para analizar la pregunta real
    function quitarSaludoInicial(textoNorm) {
        if (!textoNorm) return '';
        return textoNorm
            .replace(/^(hola|buenas|buenos dias|buenas tardes|buenas noches|que onda|que tal|hey|oye|disculpa|por favor|porfa)\s+/g, '')
            .replace(/^(osito|osita|mascotita|bot|ia)\s+/g, '')
            .replace(/^(dime|cuentame|respondeme|una pregunta|quiero saber|me dices|me puedes decir|sabes)\s+/g, '')
            .trim();
    }

    // Simplificación fonética básica para tolerancia a errores ortográficos en español
    function simplificarFonetica(texto) {
        let t = normalizarTexto(texto);
        t = t.replace(/(.)\1+/g, '$1');
        t = t.replace(/v/g, 'b');
        t = t.replace(/z/g, 's');
        t = t.replace(/c(?=[ei])/g, 's');
        t = t.replace(/qu(?=[ei])/g, 'k');
        t = t.replace(/c(?=[aou])/g, 'k');
        t = t.replace(/ll/g, 'y');
        t = t.replace(/h/g, '');
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

    // Detecta si el mensaje tiene múltiples preguntas distintas a la vez (para que OpenRouter las responda completas)
    function esPreguntaCompuesta(norm) {
        const signos = (String(norm || '').match(/\b(que|como|cual|cuales|quien|por que|porque|cuando|cuantos|cuantas|donde)\b/g) || []);
        if (signos.length >= 2 && /\b(y|tambien|ademas)\b/.test(norm)) {
            // Permitir frases cortas de una sola intención como "qué haces cuando quieres divertirte"
            if (!/(haces cuando|cuando empezaste a|por que cuando)/.test(norm) && norm.split(' ').length >= 8) {
                return true;
            }
        }
        return false;
    }

    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    // MOTOR DE BÚSQUEDA Y COINCIDENCIA EN LA BASE (SIN CONFUNDIR PREGUNTAS)
    // ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
    function buscarEnBaseConocimiento(preguntaUsuario, opciones) {
        const opts = opciones || {};
        const normOriginal = normalizarTexto(preguntaUsuario);
        const normUsuario = quitarSaludoInicial(normOriginal) || normOriginal;

        if (!normUsuario) return null;

        // Bloqueo inmediato de preguntas personales o privadas
        if (esPreguntaPersonalPrivada(normUsuario)) {
            return RESPUESTA_PRIVACIDAD;
        }

        // Aviso amable si piden crear o generar imágenes
        if (/\b(crea|crear|genera|generar|haz|hacer|dibuja|dibujar)\s+(una\s+|la\s+|algunas\s+)?(imagen|imagenes|foto|fotos|dibujo|ilustracion)\b/.test(normUsuario)) {
            return 'No genero imágenes, pero puedo responderte cualquier pregunta, ayudarte con tus tareas, explicarte cosas de videojuegos o platicar contigo de lo que quieras. 😊';
        }

        // Si el usuario hace varias preguntas distintas en un mismo mensaje y OpenRouter está activo,
        // dejamos que OpenRouter responda todas juntas con los datos oficiales.
        if (!opts.modoOffline && esPreguntaCompuesta(normUsuario)) {
            return null;
        }

        // 0. DATOS OFICIALES DE OSITO Y DEL CANAL (Edad de Osito, cumpleaños, años del canal, país, editor, etc.)
        // =========================================================================

        // 0.0 Nombre del creador de la IA / de la página ("Mi creador se llama Osito.")
        if (/(como se llama (tu|el) creador|quien (es (tu|el) creador|te creo|te hizo|te programo|creo (esta ia|el sitio|la pagina|el sotano))|cual es el nombre de (tu|el) creador|nombre de tu creador)/.test(normUsuario)) {
            return 'Mi creador se llama Osito.';
        }

        // 0.0a Nombre del SITIO / aplicación / página web ("El Sótano de Osito")
        if (/(como se llama (el sitio|la pagina|esta pagina|este sitio|la aplicacion|la app|esta app|el programa|este espacio|el sotano|la web|esta web)|cual es el nombre (del sitio|de la pagina|de esta pagina|de este sitio|de la app|de la aplicacion|de la web)|nombre (del sitio|de la pagina|de la app|de la web)|que es este sitio|de que es este sitio|como se llama este lugar|que lugar es este)/.test(normUsuario)) {
            return 'El sitio se llama «El Sótano de Osito». Es la aplicación y plataforma oficial del creador Osito (OsitoGamer360YT) con videos, directos, música y chat.';
        }

        // 0.0a2 Nombre de la IA / Quién eres
        if (/(quien eres|como te llamas|cual es tu nombre|que eres|como te pusieron|tu nombre)/.test(normUsuario) && !/(canal|creador|editor|colaborador|sitio|pagina|app)/.test(normUsuario)) {
            return 'Soy «La mascotita del Sótano», la inteligencia artificial oficial de El Sótano de Osito y del canal OsitoYT360.';
        }

        // 0.0b Nombre actual del CANAL en YouTube (sin confundir con "primer canal" ni con "primer video")
        if (/(como se llama (el|tu|su) canal|cual es (el nombre de(l| tu| su) canal|(tu|su|el) canal( de youtube)?|el canal de osito)|nombre (actual |oficial )?de(l| tu| su) canal|como te llamas en youtube|como se llama osito en youtube|como aparece (el canal|en youtube)|como busco (el|tu) canal|canal de youtube de osito)/.test(normUsuario) &&
            !/(primer|primero|anterior|original|antes|llamaba|video|serie|editor)/.test(normUsuario)) {
            return 'El canal se llama OsitoGamer360YT (Osito Gamer 360 YouTube).';
        }

        // 0.1 Edad o años del CANAL en YouTube (diferenciar de la edad de Osito)
        if (/(canal|youtube|ositoyt360|ositogamer360yt|ositogamer360|sotano)/.test(normUsuario) &&
            /(cuantos (anos|años)|que edad|cuanto tiempo lleva|aniversario|cumpleanos del canal|cumple del canal|cuando se creo el canal)/.test(normUsuario)) {
            if (/cuanto falta/.test(normUsuario)) {
                const mNum = normUsuario.match(/(\d+)\s*(anos|años)/);
                return obtenerTiempoFaltaCanal(mNum ? Number(mNum[1]) : undefined);
            }
            const anos = calcularAnosCanal();
            return `El canal OsitoYT360 tiene ${anos} años en YouTube. Su aniversario es el 2 de junio (empezó el 2 de junio de 2022). 🎉`;
        }

        if (/cuanto falta para.*(aniversario|cumpleanos del canal|anos en youtube|años en youtube)/.test(normUsuario)) {
            const mNum = normUsuario.match(/(\d+)\s*(anos|años)/);
            return obtenerTiempoFaltaCanal(mNum ? Number(mNum[1]) : undefined);
        }

        // 0.2 Edad de Osito / cuántos años tiene Osito / cuándo nació / cuándo es su cumpleaños
        if (/(cuantos (anos|años) (tiene|tienes|tenes)|que edad (tiene|tienes|tenes)|cual es (la edad de osito|tu edad)|edad de osito|anos tiene osito|años tiene osito)/.test(normUsuario) &&
            !/(canal|youtube)/.test(normUsuario)) {
            const edad = calcularEdadCreador();
            return `Osito tiene ${edad} años (nació el 28 de septiembre de 2008).`;
        }

        if (/(cuando (cumple|cumples) (anos|años)|cuando es (el cumpleanos de osito|tu cumpleanos|el cumple de osito|tu cumple)|fecha de nacimiento de osito|en que (ano|año|fecha) (nacio osito|naciste)|cuando (nacio osito|naciste))/.test(normUsuario)) {
            const edad = calcularEdadCreador();
            return `Osito nació el 28 de septiembre de 2008, así que su cumpleaños es el 28 de septiembre y actualmente tiene ${edad} años. 🎂`;
        }

        // 0.3 País / nacionalidad de Osito
        if (/(de que pais (es osito|eres)|de donde (es osito|eres)|en que pais (vive|nacio) osito|cual es (tu pais|el pais de osito|la nacionalidad de osito|tu nacionalidad))/.test(normUsuario)) {
            return 'Osito es de El Salvador. 🇸🇻';
        }

        // 0.4 Editor de Osito (Santiago)
        if (/(quien (es tu editor|es el editor|edita tus videos|edita los videos|te edita)|como se llama (tu editor|el editor)|quien es santiago)/.test(normUsuario)) {
            return 'El editor del canal es Santiago.';
        }

        // 0.5 Colaborador de Osito (Allay MC)
        if (/(quien es (tu colaborador|el colaborador|allay mc)|con quien colaboras|colaborador del canal)/.test(normUsuario)) {
            return 'El colaborador del canal es Allay MC.';
        }

        // 0.6 Serie de Minecraft (Survivalang)
        if (/(como se llama (tu serie|la serie)|cual es (tu serie|la serie de minecraft)|que es survivalang|serie del canal)/.test(normUsuario) &&
            !normUsuario.includes('seguidores') && !normUsuario.includes('comunidad')) {
            return 'La serie de Minecraft del canal se llama Survivalang.';
        }

        // 0.7 Mayor logro del canal (1000 suscriptores)
        if (/(cual (es|fue|ha sido) (tu mayor logro|el logro del canal|tu logro)|logro (mas importante|del canal))/.test(normUsuario)) {
            return 'Uno de los mayores logros del canal ha sido llegar a los 1000 suscriptores.';
        }

        // 0.8 Reglas en los directos
        if (/(reglas (de los directos|del directo|en los directos|del canal))/.test(normUsuario)) {
            return 'Las reglas en los directos son: no insultos, no humillar a la gente y mantener todo humildemente.';
        }

        // 0.9 Nombre del sitio y de la aplicación oficial
        if (/(como se llama (el|este|tu)?\s*(sitio|pagina|web|app|aplicacion|lugar)|cual es el nombre (del|de este|de la)?\s*(sitio|pagina|web|app|aplicacion)|de que es (el|este)?\s*(sitio|pagina|web|app))/.test(normUsuario)) {
            return 'El sitio y la aplicación oficial se llaman «El Sótano de Osito», la plataforma creada por Osito (canal oficial OsitoYT360 / Osito Gamer 360 YouTube) con videos, directos, chat en vivo y minijuegos. 😊';
        }

        // 1. REVISIÓN EXACTA DE LAS 19 PREGUNTAS OFICIALES
        // =========================================================================

        // Item 4: Cara / Face reveal / Rostro
        if (/(face.*reveal|feis.*ribil|mostrar.*(tu )?cara|ensenar.*(tu )?(cara|rostro)|ocultas.*(tu )?cara|tapas.*(la |tu )?cara|ver.*tu.*cara|no.*muestras.*(tu )?cara|no.*ensenas.*(tu )?(cara|rostro)|algun.*dia.*mostraras.*tu.*cara)/.test(normUsuario) ||
            /(por que|porque|cuando).*(cara|rostro|face reveal)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 4).respuesta;
        }

        // Item 11: Video más difícil de editar
        if (/(dificil|costo.*mas|dio.*mas.*trabajo|mas.*complicado).*(editar|edicion|proyecto)/.test(normUsuario) ||
            /(video|edicion|proyecto).*(mas.*dificil|costo.*mas|dio.*mas.*trabajo)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 11).respuesta;
        }

        // Item 10: Video favorito
        if (/(video.*favorito|video.*preferido|video.*te.*gusta.*mas|que.*video.*te.*gusta)/.test(normUsuario) &&
            !normUsuario.includes('dificil') && !normUsuario.includes('editar') && !normUsuario.includes('primer')) {
            return BASE_CONOCIMIENTO.find(i => i.id === 10).respuesta;
        }

        // Item 1: Cuándo empezaste a interesarte por YouTube / quién te inspiró (antes de Item 8 para no confundir "interesarte/inspiró" con fecha del primer video)
        if (/(cuando.*(interesarte|interesar).*youtube|desde.*cuando.*te.*gusta.*youtube|quien.*(te.*inspiro|fue.*tu.*inspiracion)|inspiracion.*youtube|querer.*ser.*youtuber|desde.*cuando.*haces.*contenido|por.*que.*empezaste.*en.*youtube|cuando.*comenzaste.*con.*youtube|maxwhish|max wish)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 1).respuesta;
        }

        // Item 8: Fecha o día del primer video / cuándo empezaste en YouTube
        if (/(cuando.*(fue.*tu.*primer.*video|subiste.*tu.*primer.*video|empezaste.*en.*youtube|comenzaste.*en.*youtube)|fecha.*(de.*tu.*primer.*video|exacta.*de.*tu.*primer.*video|comenzaste|empezaste)|que.*dia.*comenzaste|en.*que.*fecha.*comenzaste)/.test(normUsuario) ||
            /22.*de.*octubre/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 8).respuesta;
        }

        // Item 2: Nombre del primer canal (sin confundir con "primer video del canal")
        if (/(primer\s+canal|canal\s+original|canal\s+antes\s+de\s+ositoyt360|canal\s+anterior|nombre\s+de\s+tu\s+primer\s+canal|como\s+se\s+llamaba\s+tu\s+(primer\s+)?canal|cual\s+(fue|era)\s+tu\s+primer\s+canal)/.test(normUsuario) &&
            !normUsuario.includes('video')) {
            return BASE_CONOCIMIENTO.find(i => i.id === 2).respuesta;
        }

        // Item 3: Cuál fue tu primer video (título/nombre del video, no fecha)
        if (/(cual.*fue.*tu.*primer.*video|que.*video.*subiste.*primero|como.*se.*llamaba.*tu.*primer.*video|primer.*video.*(de.*youtube|del.*canal)|que.*video.*hiciste.*al.*principio|nombre.*de.*tu.*primer.*video)/.test(normUsuario) ||
            /perrerias.*de.*mike/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 3).respuesta;
        }

        // Item 18: Por qué revivir Craftsman (motivo, nostalgia, servidores apagados)
        if (/(por.*que.*(quieres.*)?(revivir|volver|recuperar).*(craftsman|comunidad|servidores)|motivo.*revivir|que.*te.*motivo.*a.*revivir|que.*tiene.*de.*especial.*esa.*comunidad|por.*que.*te.*da.*nostalgia.*craftsman|servidores.*apagados)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 18).respuesta;
        }

        // Item 19: Qué quieres recuperar de los antiguos servidores (mapas nostálgicos)
        if (/(que.*quieres.*recuperar.*(de.*los.*antiguos.*servidores|de.*esa.*epoca)|que.*quieres.*traer.*de.*vuelta|que.*extranas.*de.*esos.*servidores|que.*era.*lo.*mas.*nostalgico|que.*mapas.*quieres.*volver.*a.*ver)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 19).respuesta;
        }

        // Item 17: Planes para Craftsman / BedWars (planes a futuro)
        if (/(planes.*(tienes.*para.*)?(craftsman|bedwars)|que.*quieres.*hacer.*con.*craftsman|vas.*a.*volver.*a.*craftsman|proyectos.*para.*craftsman|quieres.*revivir.*craftsman|vas.*a.*revivir.*la.*comunidad.*de.*craftsman)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 17).respuesta;
        }

        // Item 9: Por qué elegiste el nombre OsitoGamer360
        if (/(por.*que.*(elegiste|te.*pusiste|te.*llamas).*(nombre|ositogamer360|ositoyt360)|de.*donde.*salio.*(ositogamer360|el.*nombre)|que.*significa.*ositogamer360|como.*nacio.*(ese.*|el.*)?nombre|peluche.*de.*panda)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 9).respuesta;
        }

        // Item 7: Sueño / meta con YouTube
        if (/(sueno.*con.*youtube|meta.*como.*youtuber|mayor.*(sueno|meta)|que.*quieres.*(lograr|conseguir).*con.*(youtube|tu.*canal)|hasta.*donde.*quieres.*llegar)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 7).respuesta;
        }

        // Item 13: Qué quieres mejorar en tus videos
        if (/(que.*(aspectos.*)?quieres.*mejorar|en.*que.*quieres.*mejorar|quieres.*mejorar.*(tu.*|tus.*)?(edicion|miniaturas|voz|canal|videos)|trabarme.*al.*hablar)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 13).respuesta;
        }

        // Item 14: Qué les gusta a tus seguidores (antes de Item 5 para evitar colisión en "juegos favoritos de tu comunidad")
        if (/(que.*les.*gusta.*a.*tus.*seguidores|que.*contenido.*(le.*gusta|disfruta).*tu.*comunidad|que.*(juegos|contenido).*(prefieren|quieren.*ver).*tus.*seguidores|juegos.*favoritos.*de.*tu.*comunidad)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 14).respuesta;
        }

        // Item 15: Vas a volver a hacer directos
        if (/(volver.*a.*hacer.*directos|volveras.*a.*hacer.*(directos|streams)|haras.*directos.*otra.*vez|regresar.*a.*los.*(directos|livestreams)|cuando.*(volveran.*los.*directos|haras.*en.*vivo|haras.*directo)|tendras.*transmisiones.*en.*vivo|horario.*de.*directos)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 15).respuesta;
        }

        // Item 16: Evento grande planeado
        if (/(planeado.*algun.*evento|vas.*a.*hacer.*algun.*evento|habra.*un.*evento.*grande|tienes.*algun.*(evento|proyecto).*(grande|preparado)|haras.*otro.*evento)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 16).respuesta;
        }

        // Item 5: Juegos favoritos para grabar (Minecraft y Roblox)
        if (/(cuales.*son.*tus.*juegos.*favoritos|cual.*es.*tu.*juego.*favorito|que.*(juegos|videojuegos).*(te.*gusta.*grabar|haces.*en.*tu.*canal|juegas.*para.*tus.*videos)|tambien.*juegas.*roblox|te.*gusta.*minecraft)/.test(normUsuario) &&
            !normUsuario.includes('seguidores') && !normUsuario.includes('comunidad')) {
            return BASE_CONOCIMIENTO.find(i => i.id === 5).respuesta;
        }

        // Item 6: Qué te gusta más de crear contenido (distinto de jugar en general)
        if (/(mas.*te.*gusta.*de.*crear.*contenido|que.*disfrutas.*de.*hacer.*videos|que.*parte.*de.*crear.*contenido.*te.*gusta|que.*te.*gusta.*hacer.*como.*creador|que.*disfrutas.*siendo.*youtuber|que.*es.*lo.*mejor.*de.*hacer.*videos)/.test(normUsuario)) {
            return BASE_CONOCIMIENTO.find(i => i.id === 6).respuesta;
        }

        // Item 12: Qué es lo que más disfrutas hacer (actividad general: Jugar)
        if (/(que.*es.*lo.*que.*mas.*disfrutas.*hacer|que.*te.*gusta.*hacer.*mas|que.*disfrutas.*mas|cual.*es.*tu.*(actividad|pasatiempo|hobby).*favorit|que.*haces.*cuando.*quieres.*divertirte)/.test(normUsuario) &&
            !normUsuario.includes('crear') && !normUsuario.includes('video') && !normUsuario.includes('contenido') &&
            !normUsuario.includes('comida') && !normUsuario.includes('color') && !normUsuario.includes('pelicula') && !normUsuario.includes('cancion') && !normUsuario.includes('animal')) {
            return BASE_CONOCIMIENTO.find(i => i.id === 12).respuesta;
        }

        // Extras: Canciones
        if (/(sacar.*canciones|sacar.*musica|canciones.*en.*el.*futuro|habra.*mas.*canciones|vas.*a.*hacer.*canciones|cuando.*sacas.*canciones)/.test(normUsuario)) {
            return INFORMACION_EXTRA.canciones;
        }

        // Extras: Osito Expo 2026
        if (/(cuando.*osito.*expo|que.*es.*osito.*expo|se.*viene.*osito.*expo|^osito.*expo.*2026$)/.test(normUsuario)) {
            return INFORMACION_EXTRA.expo2026;
        }

        // 2. COINCIDENCIA ESTRICTA CONTRA LAS VARIACIONES OFICIALES (EVITA FALSOS POSITIVOS)
        // =========================================================================
        // No forzar coincidencias en preguntas de cultura general, matemáticas, tutoriales o temas ajenos
        if (/\b(como (hacer|se hace|puedo|funciona)|que significa (?!ositogamer)|cual es la capital|quien (invento|descubrio|fue el presidente)|explicame|resuelve|traduce|cuanto (es|son|da|cuesta)|historia de|receta de|comida favorita|color favorito|animal favorito|pelicula favorita)\b/.test(normUsuario)) {
            return null;
        }

        const fonUsuario = simplificarFonetica(normUsuario);
        let mejorCoincidencia = null;
        let mejorPuntaje = 0;

        for (const item of BASE_CONOCIMIENTO) {
            for (const variacion of item.variaciones) {
                const normVariacion = normalizarTexto(variacion);
                if (normUsuario === normVariacion) {
                    return item.respuesta;
                }
                const fonVariacion = simplificarFonetica(variacion);
                if (fonUsuario === fonVariacion) {
                    return item.respuesta;
                }

                const puntajeNorm = calcularSimilitudBigramas(normUsuario, normVariacion);
                const puntajeFon = calcularSimilitudBigramas(fonUsuario, fonVariacion);
                const puntaje = Math.max(puntajeNorm, puntajeFon);

                let tieneKeywordFrase = false;
                if (item.keywords) {
                    for (const kw of item.keywords) {
                        const kwNorm = normalizarTexto(kw);
                        if (kwNorm && normUsuario.includes(kwNorm)) {
                            tieneKeywordFrase = true;
                            break;
                        }
                    }
                }

                // Exigimos alta similitud real con la variación oficial para NUNCA equivocarse de pregunta
                if (!tieneKeywordFrase && puntaje < 0.86) {
                    continue;
                }

                const puntajeTotal = puntaje + (tieneKeywordFrase ? 0.08 : 0);
                if (puntajeTotal > mejorPuntaje) {
                    mejorPuntaje = puntajeTotal;
                    mejorCoincidencia = item;
                }
            }
        }

        const umbralMinimo = opts.modoOffline ? 0.72 : 0.84;
        if (mejorCoincidencia && mejorPuntaje >= umbralMinimo) {
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
        INFO_CANAL,
        BASE_CONOCIMIENTO,
        INFORMACION_EXTRA,
        MENSAJES_NO_DISPONIBLE,
        MENSAJES_LIMITE_INVITADO,
        RESPUESTA_PRIVACIDAD,
        esPreguntaPersonalPrivada,
        calcularEdadCreador,
        calcularAnosCanal,
        obtenerTiempoFaltaCanal,
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
