# Configuración de IA de El Sótano de Osito

La IA usa **Google Gemini** mediante el backend `server.js` (la clave nunca llega al navegador).

- `GEMINI_API_KEY`: clave de Google AI Studio (en Render: Environment; en local: archivo `.env`).
- Chat e imágenes: `/api/ia` (modelo `gemini-3.8-flash`).
- Voz en vivo: WebSocket `/api/ia/live` (modelo `gemini-3.8-live`), usado por el modo llamada (`gemini-live.js`).
- Estado: `/api/ia/estado?probar=1`.
