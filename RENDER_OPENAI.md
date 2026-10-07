# Configuración en Render

En tu Web Service de Render ve a Environment > Environment Variables y agrega:

- `OPENAI_API_KEY` = tu clave de API de OpenAI
- `OPENAI_MODEL` = `gpt-6-luna`

No pongas la clave en el frontend.

Después haz un nuevo Deploy. Con el servidor activo puedes comprobar:

`/api/ia/estado?probar=1`

Debe indicar `proveedor: "openai"` y `prueba.ok: true`.

El modo chat usa OpenAI para texto e imágenes. El modo llamada conserva el sistema de micrófono/voz que ya tenía el proyecto.
