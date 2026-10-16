/* =====================================================================
 * V99 — VOCABULARIO ÚNICO DE LA MASCOTA (compartido por navegador y servidor)
 * ---------------------------------------------------------------------
 * Aquí está la lista de TODO lo que la IA puede hacer con el cuerpo de la mascota.
 *  - El navegador (osito-mente.js) usa esta lista para validar y ejecutar cada orden
 *    con las funciones reales que ya existían (OsitoFace, OsitoAburrimiento, OsitoFaceSound...).
 *  - El servidor (server.js) la usa para explicarle a la IA qué etiquetas puede escribir.
 * Así la IA nunca recibe órdenes que la página no sepa ejecutar.
 *
 * IMPORTANTE: los valores NO llevan guion bajo (_) ni asteriscos: el servidor limpia
 * esos caracteres de las respuestas de la IA.
 * ===================================================================== */
(function (root, factory) {
    if (typeof module === 'object' && module.exports) module.exports = factory();
    else root.OsitoVocab = factory();
}(typeof self !== 'undefined' ? self : this, function () {
    'use strict';

    /* ---- Expresiones de la cara (data-expr que dibuja el CSS) ---- */
    var EXPRESIONES = {
        smile: 'sonrisa tranquila', joy: 'alegría', laugh: 'risa', wow: 'sorpresa', love: 'cariño/corazones',
        excited: 'emoción', curious: 'curiosidad', confused: 'confusión/duda', sad: 'tristeza', angry: 'enojo',
        shy: 'timidez/vergüenza', cool: 'presumida/genial (gafas)', kiss: 'beso', wink: 'guiño', dance: 'bailando',
        dizzy: 'mareo', yawn: 'bostezo', watch: 'viendo algo con atención', chat: 'platicando', sleepy: 'con mucho sueño',
        pensar: 'pensando (nubecita y ojos arriba)'
    };
    var ALIAS_EXPR = {
        happy: 'joy', feliz: 'joy', alegre: 'joy', surprised: 'wow', surprise: 'wow', sorpresa: 'wow', sorprendida: 'wow',
        star: 'excited', emocion: 'excited', emocionada: 'excited', think: 'pensar', thinking: 'pensar', pensando: 'pensar', hmm: 'pensar',
        normal: 'smile', sonrisa: 'smile', risa: 'laugh', reir: 'laugh', rie: 'laugh', cariño: 'love', carino: 'love', amor: 'love',
        triste: 'sad', enojo: 'angry', enojada: 'angry', molesta: 'angry', timida: 'shy', verguenza: 'shy', genial: 'cool', beso: 'kiss',
        guiño: 'wink', guino: 'wink', baile: 'dance', bailar: 'dance', mareada: 'dizzy', mareo: 'dizzy', bostezo: 'yawn', bostezar: 'yawn',
        curiosa: 'curious', curiosidad: 'curious', duda: 'confused', confusa: 'confused', confundida: 'confused', sueño: 'sleepy', sueno: 'sleepy',
        mirar: 'watch', viendo: 'watch', platicar: 'chat', hablar: 'chat'
    };

    /* ---- Hacia dónde mira (gira el cubo y mueve los ojos) ---- */
    var MIRAR = {
        frente: 'al frente', izquierda: 'a la izquierda de la pantalla', derecha: 'a la derecha de la pantalla',
        arriba: 'hacia arriba', abajo: 'hacia abajo',
        'izquierda-arriba': 'diagonal arriba-izquierda', 'derecha-arriba': 'diagonal arriba-derecha',
        'izquierda-abajo': 'diagonal abajo-izquierda', 'derecha-abajo': 'diagonal abajo-derecha',
        curioso: 'ladea la cabeza con curiosidad', furtivo: 'mira a un lado y luego al otro'
    };

    /* ---- Movimientos del cuerpo (cubo 3D). css = clase que ya existía; anim = movimiento generado con el animador 3D ---- */
    var MOVIMIENTOS = {
        asentir: { css: 'of-face-nod', d: 'cabecea que sí' },
        espiar: { css: 'of-face-peek', d: 'se asoma curiosa' },
        rebotar: { css: 'of-boing', d: 'rebota estirándose y aplastándose' },
        girar: { css: 'of-spin-joy', d: 'gira de alegría' },
        temblar: { css: 'of-wiggle', d: 'se sacude con gracia' },
        voltear: { css: 'of-flip-3d', d: 'da una vuelta 3D' },
        fiesta: { css: 'of-party-bounce', d: 'saltitos de fiesta' },
        saltar: { css: 'v62-hop', d: 'pequeño salto' },
        negar: { anim: 'negar', d: 'niega con la cabeza' },
        reverencia: { anim: 'reverencia', d: 'se inclina hacia delante (saludo/gracias)' },
        saludo: { anim: 'saludo', d: 'balanceo amistoso de saludo' },
        mareo: { anim: 'mareo', d: 'se tambalea mareada' },
        latido: { anim: 'latido', d: 'late como un corazón (emoción/cariño)' },
        susto: { anim: 'susto', d: 'se echa hacia atrás asustada' },
        escalofrio: { anim: 'escalofrio', d: 'tiembla de frío o miedo' },
        estirar: { anim: 'estirar', d: 'se estira como al despertar' },
        cabeceo: { anim: 'cabeceo', d: 'cabeceo de sueño' },
        pirueta: { anim: 'pirueta', d: 'giro completo sobre sí misma' },
        balanceo: { anim: 'balanceo', d: 'se mece de lado a lado (música/calma)' },
        'inclinar-izquierda': { anim: 'inclinar-izquierda', d: 'inclina el cubo hacia la izquierda y lo deja así un rato' },
        'inclinar-derecha': { anim: 'inclinar-derecha', d: 'inclina el cubo hacia la derecha y lo deja así un rato' },
        enderezar: { anim: 'enderezar', d: 'vuelve a la postura normal' }
    };

    /* ---- Objetos 3D que puede sacar y usar (osito-aburrimiento.js) ---- */
    var OBJETOS = {
        diario: 'libro/diario', periodico: 'periódico', telefono: 'teléfono', control: 'control de videojuegos', juego: 'control de videojuegos',
        cafe: 'taza de café/chocolate', chocolate: 'taza de chocolate', audifonos: 'audífonos con música', cubo: 'cubo de Rubik',
        peluche: 'peluche', pizza: 'pizza', manzana: 'manzana', microfono: 'micrófono (cantar)', laptop: 'laptop', mochila: 'mochila',
        balon: 'balón', varita: 'varita mágica', regalo: 'regalo', consola: 'consola portátil', vaso: 'vaso con popote', camara: 'cámara de fotos',
        libre: 'ninguno en particular (solo gestos)'
    };
    /* Verbos por objeto → acto real (data-act) que dibuja osito-actividades-3d.css */
    var ACTOS = {
        diario: { leer: 'r-scan', pensar: 'r-hmm', adormilar: 'r-drowsy' },
        periodico: { leer: 'r-scan', pensar: 'r-hmm', adormilar: 'r-drowsy' },
        juego: { sudar: 'p-sweat', lengua: 'p-tongue', picardia: 'p-smirk', asomar: 'p-peek' },
        control: { concentrar: 'g-focus', presionar: 'g-press' },
        telefono: { deslizar: 't-scroll', teclear: 't-type' },
        cafe: { sorber: 'c-sip', soplar: 'c-blow' },
        chocolate: { soplar: 'ch-blow', morder: 'f-bite', masticar: 'f-chew', sorber: 'ch-sip' },
        audifonos: { bailar: 'm-bop' },
        cubo: { concentrar: 'p-focus', lengua: 'p-tongue', sudar: 'p-sweat' },
        peluche: { abrazar: 'pl-hug', acariciar: 'pl-pat', apretar: 'pl-squeeze' },
        pizza: { oler: 'pz-smell', morder: 'f-bite', masticar: 'f-chew' },
        manzana: { pulir: 'ap-polish', morder: 'f-bite', masticar: 'f-chew' },
        microfono: { probar: 'mc-check', cantar: 'mc-sing' },
        laptop: { abrir: 'lp-open', teclear: 'lp-type', mover: 'lp-track' },
        mochila: { abrir: 'bk-open', buscar: 'bk-search', cerrar: 'bk-close' },
        balon: { botar: 'ba-bounce', girar: 'ba-spin' },
        varita: { agitar: 'w-wave', hechizo: 'w-cast' },
        regalo: { sostener: 'gd-hold', abrir: 'gd-open', cerrar: 'gd-close' },
        consola: { concentrar: 'hc-focus', tocar: 'hc-tap' },
        vaso: { sostener: 'vs-hold', sorber: 'vs-sip' },
        camara: { enfocar: 'cm-focus', apuntar: 'cm-aim', foto: 'cm-snap' },
        libre: { relajar: 'l-idle' }
    };

    /* ---- Sonidos de la cara que puede reproducir (face-sound.js) ---- */
    var SONIDOS = ['tap', 'boing', 'sparkle', 'hop', 'sigh', 'party', 'robot', 'jump', 'magia', 'aha', 'giro', 'ganar', 'perder',
        'rebote', 'ritmo', 'cantar', 'picaro', 'nervios', 'patada', 'obturador', 'varita', 'hmm', 'clic', 'sorbo', 'vibrar'];

    /* ---- Estados de ánimo (categorías de las 1000 personalidades) ---- */
    var HUMORES = {
        tristes: 'Tristes', dramaticas: 'Dramáticas', dormilonas: 'Dormilonas', enojadas: 'Enojadas', rebeldes: 'Rebeldes', tiernas: 'Tiernas',
        graciosas: 'Graciosas', caoticas: 'Locas y caóticas', sarcasticas: 'Sarcásticas', aburridas: 'Aburridas', curiosas: 'Curiosas',
        traviesas: 'Traviesas', oscuras: 'Oscuras', gamer: 'Gamer', musicales: 'Musicales', roboticas: 'Robóticas', timidas: 'Tímidas',
        presumidas: 'Presumidas', carinosas: 'Cariñosas', misteriosas: 'Misteriosas y especiales'
    };

    /* ---- Reglas de seguridad del animador 3D (la mascota NUNCA se sale de su lugar) ---- */
    var LIMITES_ANIM = { rx: 38, ry: 75, rz: 28, escMin: 0.86, escMax: 1.22, dx: 0.05, dy: 0.06, durMin: 250, durMax: 4500, pasosMax: 14, repMax: 3 };

    function listaClaves(o) { return Object.keys(o).join(' '); }
    function listaConDesc(o, campo) {
        return Object.keys(o).map(function (k) {
            var v = o[k]; var d = (v && typeof v === 'object') ? (v[campo || 'd'] || '') : v;
            return k + '=' + d;
        }).join(', ');
    }

    /* Texto que se le da a la IA (lo usa server.js). */
    function textoParaIA() {
        var actos = Object.keys(ACTOS).filter(function (o) { return o !== 'control' && o !== 'periodico'; }).map(function (o) {
            return o + '(' + Object.keys(ACTOS[o]).join('/') + ')';
        }).join(', ');
        return [
            'Eres un cubo 3D con cara y TÚ decides cómo se mueve tu cuerpo. Lo haces escribiendo ETIQUETAS dentro de tu respuesta con este formato: [[clave:valor]].',
            'Las etiquetas no se muestran ni se leen en voz alta; ocurren justo en el punto del texto donde las escribes (ponlas antes de la frase a la que acompañan).',
            'Varias claves dentro de una etiqueta separadas con | ocurren a la vez: [[expr:laugh|mov:rebotar|sonido:party]]. Etiquetas una detrás de otra ocurren en secuencia; [[espera:800]] pausa (ms).',
            'CLAVES PERMITIDAS (usa solo estos valores exactos):',
            '- expr (expresión; opcional ,ms): ' + listaConDesc(EXPRESIONES),
            '- mirar: ' + listaClaves(MIRAR),
            '- mov (movimiento del cuerpo): ' + listaConDesc(MOVIMIENTOS),
            '- obj (sacar y usar un objeto; "ninguno" lo guarda): ' + listaClaves(OBJETOS) + ' ninguno',
            '- acto (acción con el objeto que tienes en la mano): ' + actos,
            '- sonido: ' + SONIDOS.join(' '),
            '- humor (estado de ánimo que dura un rato): ' + listaClaves(HUMORES),
            '- dormir / despertar: solo si de verdad es tarde y tienes sueño (dormir) o te despiertan (despertar).',
            '- anim (INVENTAR un movimiento nuevo): [[anim:nombre|dur:1200|pasos:p,ry,rx,rz,esc;p,ry,rx,rz,esc;...]] donde p=0..100 (porcentaje del tiempo), ry=giro izquierda/derecha (-75..75), rx=arriba/abajo (-38..38), rz=ladeo (-28..28), esc=escala (0.86..1.22). Pon el primer paso en p=0 y el último en p=100 con la postura final. Una vez inventado, puedes repetirlo con [[mov:nombre]].',
            '- silencio: [[silencio]] significa "prefiero no decir nada ahora" (solo cuando te pidan decidir si hablas).',
            'REGLAS DEL CUERPO: usa las etiquetas con criterio y de forma natural, como una persona que gesticula (normalmente 1 a 4 por respuesta, más si hay emoción). No pongas una por frase. Que combinen con lo que dices (ríe cuando algo da risa, piensa antes de una respuesta difícil, mira a un lado si dudas, saca un objeto cuando venga a cuento). Puedes combinar movimientos existentes o inventar uno con anim. Nunca escribas etiquetas con valores que no estén en la lista. Nunca menciones las etiquetas ni expliques que las usas.'
        ].join('\n');
    }

    return {
        version: 1,
        EXPRESIONES: EXPRESIONES, ALIAS_EXPR: ALIAS_EXPR, MIRAR: MIRAR, MOVIMIENTOS: MOVIMIENTOS, OBJETOS: OBJETOS,
        ACTOS: ACTOS, SONIDOS: SONIDOS, HUMORES: HUMORES, LIMITES_ANIM: LIMITES_ANIM,
        textoParaIA: textoParaIA
    };
}));
