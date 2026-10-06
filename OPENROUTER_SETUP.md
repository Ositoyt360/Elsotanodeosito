# OpenRouter para El Sótano de Osito

Esta versión usa OpenRouter como backend principal de IA sin cambiar la interfaz del chat.

## 1. Variable secreta del servidor

En el hosting donde corre `server.js`, crea:

```text
OPENROUTER_API_KEY=TU_CLAVE
OPENROUTER_MODEL=openrouter/free
```

No pegues la clave en ningún archivo del proyecto ni la subas a GitHub.

## 2. Probar

Con el servidor encendido abre:

```text
https://TU-SERVIDOR/api/ia/estado?probar=1
```

Debe devolver un JSON donde `prueba.ok` sea `true`.

## 3. Qué conserva

- Chat normal.
- Historial/memoria que ya enviaba la página.
- Lectura y análisis de imágenes.
- Modo llamada/voz existente: el navegador sigue capturando la voz y reproduciendo la respuesta; la respuesta de IA pasa por `/api/ia`.
- Base de conocimiento local y calculadora como respaldos.

## 4. Gratis

El modelo `openrouter/free` usa los modelos gratuitos disponibles y selecciona uno compatible con la solicitud. El límite gratuito de OpenRouter depende de la cuenta; en la configuración gratuita actual es de 50 solicitudes al día. El servidor de esta versión también limita por defecto la IA a 50 solicitudes/día para no superar ese límite.

Si la cuenta tiene otro límite, se puede cambiar `IA_MAX_POR_DIA_TOTAL` desde las variables del hosting.
