# Configuración de IA de El Sótano de Osito

La IA de conversación usa OpenAI mediante el backend local `server.js`.

Variables principales:
- `OPENAI_API_KEY`: clave de OpenAI.
- `OPENAI_API_BASE`: `https://api.openai.com/v1`.
- `OPENAI_MODEL`: `gpt-5.4` por defecto (respaldo `gpt-5-mini`).

El chat, el análisis de imágenes y el modo llamada pasan por `/api/ia`.
