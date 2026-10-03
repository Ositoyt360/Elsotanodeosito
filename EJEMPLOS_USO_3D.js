/* ========================================================================
 * EJEMPLOS DE USO - Sistema 3D Mejorado de Osito V57
 * ======================================================================== */

// ===== EJEMPLO 1: Usar expresiones nuevas =====
// Una vez que el personaje está montado, puedes cambiar expresiones:

function cambiarExpresion(nombreExpresion) {
    var face = document.querySelector('.osito-face');
    if (face) {
        face.setAttribute('data-expr', nombreExpresion);
        face.setAttribute('data-fase', 'in');
    }
}

// Ejemplos de uso:
cambiarExpresion('thinking');    // Muestra 💭
cambiarExpresion('shocked');     // Muestra 😲
cambiarExpresion('blushing');    // Muestra 😳
cambiarExpresion('vampire');     // Muestra 🧛
cambiarExpresion('astronaut');   // Muestra 👨‍🚀


// ===== EJEMPLO 2: Agregar emojis personalizados =====
// Extender el sistema con tus propios emojis

if (window.OsitoFace3D) {
    // Agregar un emoji personalizado
    OsitoFace3D.agregarEmoji('ofendido', '😤', '😮‍💨');
    OsitoFace3D.agregarEmoji('feliz_extremo', '🤩', '😄');
    OsitoFace3D.agregarEmoji('volando', '🚀', '🌟');
    
    // Ahora puedes usar estas expresiones
    cambiarExpresion('ofendido');      // Tu expresión personalizada
    cambiarExpresion('feliz_extremo');
    cambiarExpresion('volando');
}


// ===== EJEMPLO 3: Sistema de animación automática =====
// Cambiar expresiones cada cierto tiempo

var expresionesAleatorias = [
    'smile', 'joy', 'dance', 'think', 'curious',
    'wink', 'love', 'laugh', 'excited', 'cool'
];

function animacionAutomatica(intervaloMs = 5000) {
    setInterval(function() {
        var expr = expresionesAleatorias[
            Math.floor(Math.random() * expresionesAleatorias.length)
        ];
        cambiarExpresion(expr);
    }, intervaloMs);
}

// Usar: animacionAutomatica(4000);  // Cambia cada 4 segundos


// ===== EJEMPLO 4: Reacciones al usuario =====
// El personaje reacciona a acciones del usuario

document.addEventListener('click', function() {
    cambiarExpresion('excited');
    setTimeout(function() {
        cambiarExpresion('smile');
    }, 2000);
});

document.addEventListener('mousemove', function() {
    var face = document.querySelector('.osito-face');
    if (face && face.getAttribute('data-expr') === 'smile') {
        face.setAttribute('data-expr', 'hover');
    }
});


// ===== EJEMPLO 5: Secuencia de expresiones =====
// Una serie de expresiones con transiciones

function secuenciaExpresiones(expresiones, intervaloMs = 1500) {
    var indice = 0;
    
    function mostrarSiguiente() {
        if (indice < expresiones.length) {
            cambiarExpresion(expresiones[indice]);
            indice++;
            setTimeout(mostrarSiguiente, intervaloMs);
        }
    }
    
    mostrarSiguiente();
}

// Ejemplo de uso:
var historia = ['thinking', 'shocked', 'excited', 'love', 'dance'];
// secuenciaExpresiones(historia, 2000);


// ===== EJEMPLO 6: Emojis según categoría =====
// Organizar emojis por categoría para fácil acceso

var emojisCategorias = {
    emocional: ['smile', 'joy', 'love', 'sad', 'angry', 'cool', 'shy'],
    activo: ['dance', 'excited', 'flying', 'diving', 'skateboard', 'rocket'],
    tematico: ['vampire', 'angel', 'devil', 'ninja', 'alien', 'robot', 'astronaut'],
    natural: ['fire', 'ice', 'water', 'earth', 'rainbow', 'magical'],
    animal: ['cat', 'dog', 'bear', 'penguin', 'butterfly', 'dragon'],
    objeto: ['book', 'guitar', 'camera', 'phone', 'gift', 'trophy']
};

function expresionAleatoriaPorCategoria(categoria) {
    if (emojisCategorias[categoria]) {
        var lista = emojisCategorias[categoria];
        var expr = lista[Math.floor(Math.random() * lista.length)];
        cambiarExpresion(expr);
        return expr;
    }
}

// Ejemplos:
// expresionAleatoriaPorCategoria('emocional');
// expresionAleatoriaPorCategoria('activo');
// expresionAleatoriaPorCategoria('tematico');


// ===== EJEMPLO 7: Sistema de estados =====
// Manejo de diferentes estados del personaje

var EstadosOsito = {
    activo: function() {
        cambiarExpresion('excited');
    },
    
    pensando: function() {
        cambiarExpresion('thinking');
    },
    
    trabajando: function() {
        cambiarExpresion('cool');
    },
    
    descansando: function() {
        cambiarExpresion('sleepy');
    },
    
    feliz: function() {
        cambiarExpresion('joy');
    },
    
    enfadado: function() {
        cambiarExpresion('angry');
    },
    
    triste: function() {
        cambiarExpresion('sad');
    },
    
    jugando: function() {
        var expresionesJuego = ['dance', 'excited', 'laugh', 'joy'];
        expresionAleatoriaPorCategoria('activo');
    }
};

// Usar: EstadosOsito.pensando();


// ===== EJEMPLO 8: Transiciones suaves =====
// Cambios de expresión con transición visual

function transicionExpresion(nuevaExpr, duracionMs = 1000) {
    var face = document.querySelector('.osito-face');
    if (!face) return;
    
    // Prepara la salida
    face.setAttribute('data-fase', 'out');
    
    setTimeout(function() {
        // Cambia la expresión
        cambiarExpresion(nuevaExpr);
        face.setAttribute('data-fase', 'in');
    }, duracionMs / 2);
}

// Usar:
// transicionExpresion('love', 800);


// ===== EJEMPLO 9: Integración con chat =====
// Reacciona a mensajes del usuario

function reaccionarAlMensaje(textoMensaje) {
    var texto = textoMensaje.toLowerCase();
    
    if (texto.includes('hola') || texto.includes('hello')) {
        cambiarExpresion('smile');
    } else if (texto.includes('amor') || texto.includes('love')) {
        cambiarExpresion('love');
    } else if (texto.includes('triste') || texto.includes('sad')) {
        cambiarExpresion('sad');
    } else if (texto.includes('ayuda') || texto.includes('help')) {
        cambiarExpresion('cool');
    } else if (texto.includes('pregunta') || texto.includes('?')) {
        cambiarExpresion('curious');
    } else if (texto.includes('gracias') || texto.includes('thanks')) {
        cambiarExpresion('grateful');
    } else if (texto.includes('wow') || texto.includes('increible')) {
        cambiarExpresion('shocked');
    } else {
        cambiarExpresion('thinking');
    }
}

// Usar en un input:
/*
document.getElementById('chat-input').addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        reaccionarAlMensaje(this.value);
    }
});
*/


// ===== EJEMPLO 10: Sistema de estrés/energía =====
// El personaje cambia según su nivel de energía

var nivelEnergia = 100;

function actualizarEnergia(cantidad) {
    nivelEnergia = Math.max(0, Math.min(100, nivelEnergia + cantidad));
    
    if (nivelEnergia > 80) {
        cambiarExpresion('excited');
    } else if (nivelEnergia > 60) {
        cambiarExpresion('smile');
    } else if (nivelEnergia > 40) {
        cambiarExpresion('confused');
    } else if (nivelEnergia > 20) {
        cambiarExpresion('sleepy');
    } else {
        cambiarExpresion('sad');
    }
}

// Usar:
// actualizarEnergia(-10);  // Pierde energía


// ===== EJEMPLO 11: Acceso directo a emojis =====
// Listar todos los emojis disponibles

function listarEmojisDisponibles() {
    if (window.OsitoFace3D) {
        console.log('Emojis de Entrada:');
        console.table(OsitoFace3D.emojis.entrada);
        
        console.log('Emojis de Salida:');
        console.table(OsitoFace3D.emojis.salida);
    }
}

// Usar: listarEmojisDisponibles();


// ===== EJEMPLO 12: Animación de respiración =====
// Control de la respiración del personaje

function respirar(velocidad = 'normal') {
    var face = document.querySelector('.osito-face');
    if (!face) return;
    
    face.classList.remove('of-breathe');
    
    setTimeout(function() {
        if (velocidad === 'rapida') {
            face.style.setProperty('--breathe-duration', '2s');
        } else if (velocidad === 'lenta') {
            face.style.setProperty('--breathe-duration', '6s');
        }
        
        face.classList.add('of-breathe');
    }, 10);
}

// Usar:
// respirar('rapida');


// ===== EJEMPLO 13: Combinar con personalidades 1000 =====
// Integración con el sistema de 1000 personalidades

function asignarPersonalidadConExpresion(idPersonalidad, expresion) {
    // Asignar personalidad (si está disponible)
    if (window.OsitoPersonalidadAnim) {
        OsitoPersonalidadAnim.aplicar(idPersonalidad, 'custom');
    }
    
    // Asignar expresión
    cambiarExpresion(expresion);
}

// Usar:
// asignarPersonalidadConExpresion(42, 'dance');


// ===== EJEMPLO 14: Panel de control de expresiones =====
// Crear un panel visual para cambiar expresiones

function crearPanelExpresiones() {
    var panel = document.createElement('div');
    panel.style.cssText = `
        position: fixed;
        bottom: 20px;
        right: 20px;
        background: rgba(0,0,0,0.8);
        color: white;
        padding: 15px;
        border-radius: 10px;
        font-size: 12px;
        z-index: 10000;
        max-height: 300px;
        overflow-y: auto;
    `;
    
    var titulo = document.createElement('h4');
    titulo.textContent = '🎭 Expresiones';
    titulo.style.margin = '0 0 10px 0';
    panel.appendChild(titulo);
    
    var expresiones = Object.keys(OsitoFace3D.emojis.entrada).slice(0, 20);
    
    expresiones.forEach(function(expr) {
        var btn = document.createElement('button');
        btn.textContent = expr + ' ' + OsitoFace3D.emojis.entrada[expr];
        btn.style.cssText = `
            display: block;
            width: 100%;
            padding: 5px;
            margin: 3px 0;
            background: #444;
            color: white;
            border: 1px solid #666;
            border-radius: 4px;
            cursor: pointer;
            text-align: left;
        `;
        btn.addEventListener('click', function() {
            cambiarExpresion(expr);
        });
        panel.appendChild(btn);
    });
    
    document.body.appendChild(panel);
}

// Usar (comentado para no afectar la página):
// crearPanelExpresiones();


// ===== EXPORTAR FUNCIONES =====
// Hacer funciones disponibles globalmente

window.OsitoExpresiones = {
    cambiar: cambiarExpresion,
    secuencia: secuenciaExpresiones,
    categoria: expresionAleatoriaPorCategoria,
    transicion: transicionExpresion,
    reaccionar: reaccionarAlMensaje,
    energia: actualizarEnergia,
    respirar: respirar,
    panel: crearPanelExpresiones,
    estados: EstadosOsito,
    listar: listarEmojisDisponibles
};

console.log('✅ Sistema de expresiones 3D cargado. Usa window.OsitoExpresiones para controlar al personaje.');
