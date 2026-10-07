# El Sótano de Osito — OpenAI + GitHub

Esta versión usa OpenAI como único proveedor de IA. No usa NVIDIA, OpenRouter, Gemini, Anthropic/Claude ni Render.

## Qué hace
- Chat de texto mediante `/api/ia`.
- Análisis de imágenes mediante OpenAI Responses API.
- Modo llamada: el navegador captura voz, la convierte a texto y envía cada turno al mismo backend; la respuesta se reproduce con la voz del navegador.
- La clave de OpenAI nunca debe estar en los archivos públicos del repositorio.

## GitHub
GitHub almacena el código del proyecto. El backend Node (`server.js`) debe ejecutarse en una máquina/servidor que tú controles; GitHub Pages por sí solo no puede ejecutar `server.js` ni ocultar `OPENAI_API_KEY`.

## Configuración local
1. Copia `.env.example` a `.env`.
2. Pon tu clave en `OPENAI_API_KEY`.
3. Ejecuta `npm install`.
4. Ejecuta `npm start`.
5. Abre `http://localhost:3000`.

Nunca subas `.env` a GitHub. `.gitignore` ya lo bloquea.
