# OpenRouter configurado

Este proyecto usa OpenRouter como proveedor principal de IA mediante el servidor Node.js.

## Configuración incluida

- `OPENROUTER_API_KEY`: se guarda en `.env`, nunca en el navegador.
- `OPENROUTER_MODEL=openrouter/free`: usa el router gratuito de OpenRouter.
- Chat: `/api/ia`
- Imágenes: el último mensaje puede incluir una imagen en base64.
- Voz: el modo llamada existente sigue usando el micrófono y la síntesis de voz del navegador; la respuesta de IA pasa por `/api/ia`.
- `GET /api/ia/estado?probar=1`: prueba realmente la conexión con OpenRouter.

OpenRouter documenta que `openrouter/free` selecciona automáticamente un modelo gratuito compatible y admite texto e imágenes.

## Arranque en Windows

1. Abre `PROBAR_OPENROUTER.bat`.
2. Si es la primera vez, ejecutará `npm install`.
3. Se abrirá la prueba de `/api/ia/estado?probar=1`.
4. Después abre `http://localhost:3000`.

También puedes usar `CONFIGURAR_OPENROUTER.bat` para reemplazar la clave de `.env`.

## Seguridad

`.env` está en `.gitignore` y el servidor bloquea el acceso HTTP a `/.env`.
No subas `.env` a GitHub.

La clave incluida en este ZIP fue expuesta durante la configuración. Revócala en OpenRouter y crea una nueva antes de publicar el proyecto.
