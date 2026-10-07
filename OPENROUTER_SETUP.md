# OpenAI para El Sótano de Osito

Esta versión usa OpenAI como proveedor principal mediante el servidor Node.js.

## Variables de entorno

En Render agrega:

```text
OPENAI_API_KEY=TU_CLAVE_DE_OPENAI
OPENAI_MODEL=gpt-6-luna
```

La clave debe estar solamente en las variables del servidor. Nunca la pongas en JavaScript del navegador, GitHub ni HTML.

## Qué funciona

- Chat de texto: `/api/ia`
- Lectura y análisis de imágenes adjuntas: `/api/ia`
- Historial de conversación y memoria local existente.
- Modo llamada: conserva el micrófono y la voz del navegador que ya tiene el proyecto; las respuestas las genera OpenAI.
- Prueba de conexión: `/api/ia/estado?probar=1`

## Importante sobre voz

El modo llamada actual es conversación por turnos: el navegador captura tu voz, la convierte a texto, `/api/ia` la envía a OpenAI y el navegador lee la respuesta. Para una llamada realmente en tiempo real, con audio bidireccional y menor latencia, habría que migrar ese modo a la API de voz en tiempo real de OpenAI.

## Seguridad

No expongas `OPENAI_API_KEY` al navegador.
