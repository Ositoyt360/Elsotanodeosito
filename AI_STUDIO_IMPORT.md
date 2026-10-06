# Importación de El Sótano de Osito en Google AI Studio

Esta copia está preparada para importarse como **aplicación web Node.js**.

## Qué se limpió

- Se eliminó la carpeta `app/` del proyecto Android y sus copias duplicadas de todos los archivos web.
- Se retiraron los archivos Gradle/Android del nivel raíz para que AI Studio detecte el proyecto como web Node.js.
- Se conservaron `index.html`, `server.js`, los archivos JavaScript/CSS, Firebase, videos, audios y demás recursos web usados por la aplicación.
- Se corrigió un error de sintaxis JavaScript en `claude-1000-original/personalidades-1000.js` que impedía validar todos los archivos `.js` con Node.
- `package.json` conserva `npm start -> node server.js` y añade compatibilidad explícita con Node 20+.

## Importante sobre el error "Internal error encountered"

Ese mensaje aparece durante la importación de GitHub y no significa necesariamente que haya un error en el código. Google AI Studio también ha tenido incidencias recientes con la conexión/importación de GitHub. Si una copia limpia de este repositorio sigue mostrando el mismo mensaje, el problema está del lado de la integración de AI Studio/GitHub y no se puede corregir desde `index.html` o `server.js`.

## Variables necesarias para ejecutar todas las funciones

Configura como secretos/variables del servidor cuando corresponda:

- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL` (por defecto: `openrouter/free`)
- `ANTHROPIC_API_KEY` (opcional, respaldo)
- `FIREBASE_SERVICE_ACCOUNT_JSON` o credenciales de aplicación de Firebase Admin para las funciones administrativas que lo necesiten
- `GITHUB_REPO` (opcional; por defecto `Ositoyt360/Elsotanodeosito`)

No se incluye ninguna clave real en este paquete.

## Configuración de OpenRouter

La IA del sitio llama a OpenRouter desde `server.js`; la clave nunca se envía al navegador.
Configura en el hosting Node estas variables:

- `OPENROUTER_API_KEY` = tu clave de OpenRouter
- `OPENROUTER_MODEL` = `openrouter/free`

`openrouter/free` selecciona automáticamente un modelo gratuito compatible con la solicitud y admite texto e imágenes. El chat, el análisis de imágenes y el modo llamada pasan por `/api/ia`.

**Importante:** no pongas `OPENROUTER_API_KEY` en `index.html`, ningún `.js`, `localStorage` ni GitHub.

Para comprobar la conexión, abre:
`https://TU-SERVIDOR/api/ia/estado?probar=1`
y debe aparecer `prueba.ok: true`.
