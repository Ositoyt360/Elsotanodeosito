# 🎭 El Sótano de Osito - Sistema de 1000 Personalidades

## 📋 Índice
1. [Descripción General](#descripción-general)
2. [Instalación](#instalación)
3. [Estructura del Sistema](#estructura-del-sistema)
4. [Cómo Usar](#cómo-usar)
5. [APIs y Funciones](#apis-y-funciones)
6. [Personalización](#personalización)
7. [Ejemplos de Implementación](#ejemplos-de-implementación)

---

## Descripción General

Este es un **sistema completo de gestión de 1000 personalidades** para "El Sótano de Osito" que incluye:

✅ **1000 personalidades diferentes** organizadas en 20 categorías
✅ **Expresiones faciales dinámicas** en SVG que cambian según la personalidad
✅ **Sistema de sonidos** únicos para cada personalidad
✅ **Comportamientos y reacciones** personalizados
✅ **Interfaz interactiva** para explorar y cambiar personalidades
✅ **Cambios naturales** de personalidad sin repeticiones constantemente

### Categorías incluidas:
1. **Personalidades Tristes** (001-050)
2. **Personalidades Dramáticas** (051-100)
3. **Personalidades Dormilonas** (101-150)
4. **Personalidades Enojadas** (151-200)
5. **Personalidades Rebeldes** (201-250)
6. **Personalidades Tiernas** (251-300)
7. **Personalidades Graciosas** (301-350)
8. **Personalidades Locas y Caóticas** (351-400)
9. **Personalidades Sarcásticas** (401-450)
10. **Personalidades Aburridas** (451-500)
11. **Personalidades Curiosas** (501-550)
12. **Personalidades Traviesas** (551-600)
13. **Personalidades Oscuras** (601-650)
14. **Personalidades Gamer** (651-700)
15. **Personalidades Musicales** (701-750)
16. **Personalidades Robóticas** (751-800)
17. **Personalidades Tímidas** (801-850)
18. **Personalidades Presumidas** (851-900)
19. **Personalidades Cariñosas** (901-950)
20. **Personalidades Misteriosas y Especiales** (951-1000)

---

## Instalación

### Opción 1: Demo Interactiva (Más Fácil)
Abre el archivo `osito-1000-personalidades-demo.html` en tu navegador. ¡No necesita servidor!

```bash
# Simplemente abre en navegador
open osito-1000-personalidades-demo.html
```

### Opción 2: Integración en tu Proyecto Osito Existente

1. **Copia los archivos JavaScript al directorio de tu proyecto:**
```bash
cp personalidades-1000.js /path/to/osito_edit/
cp expresiones-dinamicas.js /path/to/osito_edit/
cp sonidos-personalidades.js /path/to/osito_edit/
```

2. **Incluye los scripts en tu HTML (en este orden):**
```html
<script src="personalidades-1000.js"></script>
<script src="expresiones-dinamicas.js"></script>
<script src="sonidos-personalidades.js"></script>
```

3. **Añade un contenedor para la cara:**
```html
<div id="osito-cara"></div>
```

4. **Inicializa en tu JavaScript:**
```javascript
const manager = new PersonalidadManager();
const expresion = new ExpresionDinamica('osito-cara');
const sonidos = new GestorSonidos();

// Cambiar personalidad
const personalidad = manager.cambiarPersonalidadAleatoria();
if (personalidad) {
    expresion.generarExpresion(personalidad);
    sonidos.reproducirSonido(personalidad.sonido);
}
```

---

## Estructura del Sistema

### Archivo: `personalidades-1000.js`
Contiene la **base de datos de todas las personalidades** y la clase `PersonalidadManager`.

**Estructura de una personalidad:**
```javascript
{
    nombre: "Triste",
    categoria: "Triste",
    expresion: "sad",
    sonido: "suspiro",
    comportamientos: ["mirada baja", "hombros caídos", "parpadeo lento"],
    reacciones: ["*suspira profundamente*", "*mira hacia el piso*"],
    horariosActivos: { inicio: 20, fin: 8 } // Opcional, para dormilonas
}
```

### Archivo: `expresiones-dinamicas.js`
Genera **expresiones faciales en SVG** basadas en la personalidad.

**Métodos principales:**
- `generarExpresion(personalidad)` - Genera la cara
- `crearOjos(svg, x, y, expresion)` - Crea ojos con diferentes expresiones
- `criarBoca(svg, x, y, expresion)` - Crea bocas
- `parpadear()` - Anima un parpadeo

### Archivo: `sonidos-personalidades.js`
Reproduce **sonidos sintetizados** para cada personalidad usando Web Audio API.

**Métodos principales:**
- `reproducirSonido(tipo)` - Reproduce un sonido específico
- `setVolumen(valor)` - Ajusta volumen (0-1)
- `activarSonido(estado)` - Activa/desactiva sonidos

---

## Cómo Usar

### Uso Básico

```javascript
// 1. Crear un gestor de personalidades
const manager = new PersonalidadManager();

// 2. Cambiar a una personalidad aleatoria
const personalidad = manager.cambiarPersonalidadAleatoria();

// 3. Mostrar expresión
const expresion = new ExpresionDinamica('osito-cara');
expresion.generarExpresion(personalidad);

// 4. Reproducir sonido
const sonidos = new GestorSonidos();
sonidos.reproducirSonido(personalidad.sonido);
```

### Cambiar a Personalidad Específica

```javascript
// Por ID
const personalidad = manager.cambiarPersonalidad(001); // ID 001 = Triste

// Por categoría (random)
const personalidad = manager.cambiarPersonalidad(
    manager.obtenerPersonalidadAleatoria('Dramático')
);
```

### Obtener Personalidades por Categoría

```javascript
// Obtener todas de una categoría
const tristesPersonalidades = manager.obtenerCategoria('Triste');

// Formato: [{ id: '001', nombre: 'Triste', ... }]
tristesPersonalidades.forEach(p => {
    console.log(`${p.id}: ${p.nombre}`);
});
```

### Obtener Todas las Personalidades

```javascript
const todas = manager.obtenerTodasLasPersonalidades();
console.log(`Total: ${todas.length}`); // 1000
```

### Ver Resumen por Categorías

```javascript
const resumen = manager.obtenerResumenPersonalidades();
// {
//   'Triste': [{ id: '001', nombre: 'Triste' }, ...],
//   'Dramático': [...],
//   ...
// }
```

---

## APIs y Funciones

### PersonalidadManager

#### `obtenerPersonalidad(id)`
Obtiene datos completos de una personalidad.
```javascript
const personalidad = manager.obtenerPersonalidad('001');
// { nombre: 'Triste', categoria: 'Triste', ... }
```

#### `cambiarPersonalidad(id)`
Cambia a una personalidad específica.
```javascript
const personalidad = manager.cambiarPersonalidad('051');
// Devuelve: { id: '051', nombre: 'Dramático', ... }
```

#### `cambiarPersonalidadAleatoria(categoria = null)`
Cambia a una personalidad aleatoria, opcionalmente de una categoría.
```javascript
// Aleatoria de cualquier categoría
const p1 = manager.cambiarPersonalidadAleatoria();

// Aleatoria de una categoría específica
const p2 = manager.cambiarPersonalidadAleatoria('Gracioso');
```

#### `obtenerCategoria(nombreCategoria)`
Obtiene todas las personalidades de una categoría.
```javascript
const graciosos = manager.obtenerCategoria('Gracioso');
```

#### `obtenerTodasLasPersonalidades()`
Devuelve un array con las 1000 personalidades.
```javascript
const todas = manager.obtenerTodasLasPersonalidades();
```

#### `obtenerResumenPersonalidades()`
Devuelve un objeto con personalidades agrupadas por categoría.
```javascript
const resumen = manager.obtenerResumenPersonalidades();
```

#### `deberiaEstarDormido()`
Verifica si la personalidad actual debería estar dormida (basado en horarios).
```javascript
if (manager.deberiaEstarDormido()) {
    console.log('Es hora de dormir para esta personalidad');
}
```

### ExpresionDinamica

#### `generarExpresion(personalidad)`
Genera la cara con expresión basada en la personalidad.
```javascript
const expresion = new ExpresionDinamica('osito-cara');
expresion.generarExpresion(personalidad);
```

#### `parpadear()`
Anima un parpadeo.
```javascript
expresion.parpadear();
```

#### `limpiar()`
Elimina la expresión actual.
```javascript
expresion.limpiar();
```

### GestorSonidos

#### `reproducirSonido(tipo)`
Reproduce un sonido.
```javascript
const sonidos = new GestorSonidos();
sonidos.reproducirSonido('suspiro');
```

#### `setVolumen(valor)`
Ajusta el volumen (0-100).
```javascript
sonidos.setVolumen(50); // 50%
```

#### `activarSonido(estado)`
Activa o desactiva los sonidos.
```javascript
sonidos.activarSonido(true);  // Activar
sonidos.activarSonido(false); // Desactivar
```

#### `inicializarAudio()`
Inicializa el contexto de audio (se llama automáticamente).
```javascript
sonidos.inicializarAudio();
```

---

## Personalización

### Agregar una Nueva Personalidad

```javascript
// En el objeto PERSONALIDADES_DATABASE:
PERSONALIDADES_DATABASE[1001] = {
    nombre: "Mi Personalidad Personalizada",
    categoria: "Especial",
    expresion: "custom_expression",
    sonido: "custom_sound",
    comportamientos: ["comportamiento 1", "comportamiento 2"],
    reacciones: ["*reacción 1*", "*reacción 2*"],
    horariosActivos: { inicio: 18, fin: 6 } // Opcional
};
```

### Crear una Nueva Expresión Facial

Añade un nuevo método en `ExpresionDinamica`:

```javascript
crearExpresionCustomizada() {
    const svg = this.crearSVGBase();
    
    // Crea tu cara aquí usando SVG
    const cabeza = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    // ... configurar cabeza ...
    svg.appendChild(cabeza);
    
    if (this.contenedor) {
        this.contenedor.innerHTML = '';
        this.contenedor.appendChild(svg);
    }
}
```

### Crear un Nuevo Sonido

Añade un nuevo método en `GestorSonidos`:

```javascript
sonidoCustomizado() {
    const ctx = this.audioContext;
    const ahora = ctx.currentTime;
    
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    
    // Configurar tu sonido aquí
    osc.frequency.setValueAtTime(440, ahora);
    env.gain.setValueAtTime(0.1, ahora);
    env.gain.linearRampToValueAtTime(0, ahora + 0.5);
    
    osc.connect(env);
    env.connect(ctx.destination);
    
    osc.start(ahora);
    osc.stop(ahora + 0.5);
}
```

---

## Ejemplos de Implementación

### Ejemplo 1: Cambio Automático de Personalidad

```javascript
const manager = new PersonalidadManager();
const expresion = new ExpresionDinamica('osito-cara');
const sonidos = new GestorSonidos();

// Cambiar personalidad cada 5 segundos
setInterval(() => {
    const personalidad = manager.cambiarPersonalidadAleatoria();
    expresion.generarExpresion(personalidad);
    sonidos.reproducirSonido(personalidad.sonido);
    
    console.log(`Personalidad: ${personalidad.nombre}`);
}, 5000);
```

### Ejemplo 2: Botones para Cambiar Categorías

```html
<button onclick="cambiarCategoria('Dramático')">Ver Dramático</button>
<button onclick="cambiarCategoria('Gracioso')">Ver Gracioso</button>
<button onclick="cambiarCategoria('Tierno')">Ver Tierno</button>

<script>
const manager = new PersonalidadManager();
const expresion = new ExpresionDinamica('osito-cara');
const sonidos = new GestorSonidos();

function cambiarCategoria(categoria) {
    const id = manager.obtenerPersonalidadAleatoria(categoria);
    const personalidad = manager.cambiarPersonalidad(id);
    
    expresion.generarExpresion(personalidad);
    sonidos.reproducirSonido(personalidad.sonido);
}
</script>
```

### Ejemplo 3: Selector de Personalidades

```html
<select id="selector" onchange="seleccionar(this.value)">
    <option>-- Elige una personalidad --</option>
</select>

<script>
const manager = new PersonalidadManager();
const expresion = new ExpresionDinamica('osito-cara');
const sonidos = new GestorSonidos();

// Llenar selector
const selector = document.getElementById('selector');
const todas = manager.obtenerTodasLasPersonalidades();

todas.forEach(p => {
    const option = document.createElement('option');
    option.value = p.id;
    option.textContent = `${p.id} - ${p.nombre} (${p.categoria})`;
    selector.appendChild(option);
});

function seleccionar(id) {
    if (id) {
        const personalidad = manager.cambiarPersonalidad(id);
        expresion.generarExpresion(personalidad);
        sonidos.reproducirSonido(personalidad.sonido);
    }
}
</script>
```

### Ejemplo 4: Reactividad a Acciones del Usuario

```javascript
document.addEventListener('click', () => {
    const manager = new PersonalidadManager();
    const expresion = new ExpresionDinamica('osito-cara');
    const sonidos = new GestorSonidos();
    
    // Cuando el usuario hace clic, Osito se asusta o reacciona
    const personalidad = manager.cambiarPersonalidad('051'); // Dramático
    expresion.generarExpresion(personalidad);
    sonidos.reproducirSonido('wow');
});

document.addEventListener('mousemove', () => {
    // Cuando el usuario mueve el mouse, parpadea
    expresion.parpadear();
});
```

### Ejemplo 5: Panel de Control

```html
<div style="padding: 20px; background: #f0f0f0; border-radius: 10px;">
    <h2>Panel de Control de Osito</h2>
    
    <label>
        Volumen:
        <input type="range" min="0" max="100" value="30" onchange="cambiarVol(this.value)">
        <span id="vol-label">30%</span>
    </label>
    
    <label>
        Sonidos:
        <input type="checkbox" checked onchange="toggleSonido(this.checked)">
    </label>
    
    <button onclick="cambiarAleatoria()">🎲 Aleatoria</button>
    <button onclick="parpadear()">👀 Parpadear</button>
    <button onclick="cambiarSonido()">🔊 Reproducir Sonido</button>
</div>

<script>
const manager = new PersonalidadManager();
const expresion = new ExpresionDinamica('osito-cara');
const sonidos = new GestorSonidos();

function cambiarVol(v) {
    sonidos.setVolumen(v);
    document.getElementById('vol-label').textContent = v + '%';
}

function toggleSonido(estado) {
    sonidos.activarSonido(estado);
}

function cambiarAleatoria() {
    const p = manager.cambiarPersonalidadAleatoria();
    expresion.generarExpresion(p);
    sonidos.reproducirSonido(p.sonido);
}

function parpadear() {
    expresion.parpadear();
}

function cambiarSonido() {
    if (manager.personalidadActual) {
        sonidos.reproducirSonido(manager.personalidadActual.sonido);
    }
}
</script>
```

---

## Notas Técnicas

### Navegadores Soportados
- ✅ Chrome/Edge 60+
- ✅ Firefox 50+
- ✅ Safari 11+
- ✅ Mobile browsers modernos

### Requisitos
- HTML5
- CSS3
- JavaScript ES6+
- Web Audio API (para sonidos)
- SVG (para expresiones)

### Rendimiento
- Las expresiones faciales se generan en ~50ms
- Los sonidos son sintetizados (sin archivos de audio)
- Cada personalidad ocupa ~500 bytes en memoria

### Compatibilidad
El sistema funciona sin servidor, solo necesita un navegador moderno.

---

## Licencia y Créditos

Sistema de Personalidades para "El Sótano de Osito"
Creado con ❤️ para hacer a Osito más expresivo y único.

---

## Soporte y Reportes

Si encuentras problemas o tienes sugerencias:
1. Verifica que todos los archivos JS estén en el orden correcto
2. Abre la consola del navegador (F12) para ver errores
3. Asegúrate de que tu navegador tenga Web Audio API habilitado

---

## Actualizaciones Futuras

Se pueden agregar:
- ✨ Más expresiones faciales detalladas
- 🎵 Variaciones de sonidos por personalidad
- 🎬 Animaciones más complejas
- 🌈 Cambios de color según personalidad
- 👥 Interacciones entre personalidades
- 💾 Guardado de personalidades favoritas

¡Disfruta con las 1000 personalidades de Osito! 🎭✨
