/* V56 — Cara 3D de la IA.
 *  - Envuelve la tarjeta de la cara en un "rig" 3D y le agrega capas de grosor.
 *  - Los emojis de la cara (los que salen arriba a la derecha) se dibujan con capas 3D.
 *  - Cada expresión muestra su emoji al ENTRAR y otro emoji distinto al SALIR (data-leave).
 * El estilo está en osito-cara3d.css; los cambios de expresión (data-fase) los pone ia-claude.js.
 */
(function () {
    'use strict';
    var CAPAS = 8;

    // Emoji que aparece mientras dura cada expresión
    var ENTRADA = {
        smile: '✨', joy: '🎉', love: '💖', wink: '⭐', wow: '❗', excited: '🌟', curious: '❓', confused: '❔',
        angry: '💢', sad: '💧', shy: '💗', cool: '😎', kiss: '💋', laugh: '😂', dance: '🎵', dizzy: '💫',
        yawn: '🥱', sleepy: '💤', watch: '🍿', chat: '💬', hover: '✨'
    };
    // Emoji que sale cuando la expresión termina (animación de salida de cada una)
    var SALIDA = {
        angry: '💨', laugh: '😅', sad: '🌈', love: '💞', shy: '😊', wow: '😌', excited: '🎊', joy: '😊',
        dizzy: '😵‍💫', kiss: '😘', cool: '😌', dance: '🎶', yawn: '😌', confused: '💡', curious: '💡',
        watch: '🎬', chat: '🙂', sleeping: '🥱', sleepy: '🥱'
    };

    function capas(e) {
        var h = '<b class="e3 f">' + e + '</b>';
        for (var i = 1; i <= 7; i++) h += '<b class="e3 b" style="--k:' + i + '">' + e + '</b>';
        return h;
    }

    function actualizar(face) {
        var sp = face.querySelector('.of-spark');
        if (!sp) return;
        var expr = face.getAttribute('data-expr') || '';
        var fase = face.getAttribute('data-fase') || '';
        var leave = face.getAttribute('data-leave') || '';
        var estado = face.getAttribute('data-estado') || '';
        var actual = sp.getAttribute('data-e') || '';
        var e = actual;
        if (estado === 'thinking') e = '💭';
        else if (fase === 'back' && leave) e = SALIDA[leave] || '';
        else if (expr && fase !== 'out') e = ENTRADA[expr] || '💫';
        else if (!expr) e = actual; // nada nuevo: se queda el último hasta que se apague solo
        if (e === actual) return;
        sp.setAttribute('data-e', e);
        sp.innerHTML = e ? capas(e) : '';
        // Reinicia la animación para que cada emoji haga su entrada 3D
        sp.style.setProperty('animation', 'none', 'important'); void sp.offsetWidth; sp.style.removeProperty('animation');
    }

    function montar(face) {
        if (!face || face.__cara3d) return;
        var card = face.querySelector('.of-card');
        if (!card) return;
        face.__cara3d = true;

        // 1) rig 3D alrededor de la tarjeta
        if (!card.parentNode.classList || !card.parentNode.classList.contains('of-rig')) {
            var rig = document.createElement('span');
            rig.className = 'of-rig';
            card.parentNode.insertBefore(rig, card);
            rig.appendChild(card);
        }
        // 2) grosor de la cabeza
        if (!card.querySelector('.of-d')) {
            var h = '';
            for (var i = 1; i <= CAPAS; i++) h += '<i class="of-d' + (i === CAPAS ? ' end' : '') + '" style="--i:' + i + '"></i>';
            card.insertAdjacentHTML('afterbegin', h);
        }
        // 3) emoji 3D
        if (!face.querySelector('.of-spark')) face.insertAdjacentHTML('beforeend', '<i class="of-spark"></i>');
        if (window.MutationObserver) {
            new MutationObserver(function () { actualizar(face); })
                .observe(face, { attributes: true, attributeFilter: ['data-expr', 'data-fase', 'data-leave', 'data-estado'] });
        }
        actualizar(face);
    }

    function montarTodas() {
        Array.prototype.forEach.call(document.querySelectorAll('.osito-face'), montar);
    }
    montarTodas();
    // Si se crea otra cara más tarde, también queda en 3D
    if (window.MutationObserver && document.body) {
        new MutationObserver(function (list) {
            list.forEach(function (m) {
                Array.prototype.forEach.call(m.addedNodes || [], function (n) {
                    if (n.nodeType !== 1) return;
                    if (n.matches && n.matches('.osito-face')) montar(n);
                    else if (n.querySelectorAll) Array.prototype.forEach.call(n.querySelectorAll('.osito-face'), montar);
                });
            });
        }).observe(document.body, { childList: true, subtree: true });
    }
    window.OsitoFace3D = { montar: montar, montarTodas: montarTodas, emojis: { entrada: ENTRADA, salida: SALIDA } };
}());
