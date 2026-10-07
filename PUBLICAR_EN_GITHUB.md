# Publicar con IA funcionando

GitHub guarda el código; el servidor (server.js) corre en Render, gratis, conectado a tu repositorio.

1. Sube el proyecto a GitHub (el .env NO se sube).
2. En render.com: New > Blueprint > elige tu repositorio (usa render.yaml).
3. En Render > Environment: OPENAI_API_KEY = tu clave nvapi-... (nueva).
4. Cuando termine, abre la URL que te da Render (https://....onrender.com): sitio + IA funcionan juntos.
5. Prueba: https://TU-URL.onrender.com/api/ia/estado?probar=1

Si además usas GitHub Pages para el sitio:
- Pon tu URL de Render en <meta name="osito-ia-url" content="..."> en index.html e ia.html.
- En Render agrega IA_ALLOWED_ORIGINS=https://TUUSUARIO.github.io

Notas: el plan gratis se duerme tras ~15 min sin visitas (la primera respuesta tarda ~1 min) y los archivos locales (chat-data.json) se borran al reiniciar.
