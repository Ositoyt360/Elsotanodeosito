# V99 – IA conectada a la mascota 3D

Nuevos: `mascota-vocabulario.js` (vocabulario real compartido), `osito-mente.js` (cerebro: etiquetas [[...]] → expresiones, miradas, movimientos, objetos, sonidos, animaciones nuevas, habla espontánea, silencio, video, sueño).
Modificados: face-extra.js (sueño desde 2:30, 30 s, toque despierta), osito-aburrimiento.js (API dirigir/acto), ia-openai.js, chat-ia-core.js, asistente-voz.js (voz: reintentos, selector, probar voz), personalidades-1000.js, index.html, ia.html, sw.js, server.js.
El modo llamada (call-mode-engine.js) NO se tocó.

## IMPORTANTE: volver a desplegar en Render
`server.js` y `mascota-vocabulario.js` deben subirse al servidor (la página usa la IA alojada en Render).
Variables opcionales: IA_ESPONT_POR_MINUTO, IA_ESPONT_DIA_IP, IA_ESPONT_DIA_TOTAL.
Consola: `OsitoMente.autoprueba()` devuelve [] si todo el vocabulario está implementado.
