# El Sótano de Osito · V11

## Cambios de esta versión
- Conteos regresivos configurables directamente desde la página principal por la cuenta creadora OsitoYT360, con **fecha y hora exactas**.
- Se pueden agregar varios eventos, cambiar nombre/emoji/texto y eliminar conteos.
- Los cambios se sincronizan automáticamente con la portada mediante Firestore.
- Se eliminó el botón público de publicar en el chat.
- Los conteos se editan desde `index.html` por la cuenta creadora; el panel de moderación queda fuera de esta función.
- Se eliminó el panel de código de acceso del modo moderador.
- El panel de cuentas consulta directamente Firebase Authentication mediante Firebase Admin, por lo que puede detectar cuentas aunque no exista todavía su documento en `users`.
- Se mantiene un respaldo en Firestore si Firebase Admin no está disponible.
- Se corrigió la identificación consistente de `ositoyt360@elsotanodeosito.com`.

## Firebase
Publica también `firestore.rules`.

Para que el panel pueda listar todas las cuentas de Authentication, borrar usuarios y establecer contraseñas nuevas, ejecuta el sitio con `server.js` y configura Firebase Admin usando:

- `GOOGLE_APPLICATION_CREDENTIALS`, o
- `FIREBASE_SERVICE_ACCOUNT_JSON`.

Nunca pongas una cuenta de servicio dentro del navegador (`index.html`, `moderador.html` o JavaScript del cliente).

Firebase Authentication **no permite recuperar ni mostrar la contraseña actual** de una cuenta. El panel solo puede establecer una contraseña nueva.


### V13 — permisos y sincronización
Los cambios administrativos de modos, conteos, baneos y borrado de mensajes pasan por `server.js` y requieren que el servidor tenga Firebase Admin configurado con `FIREBASE_SERVICE_ACCOUNT_JSON` o credenciales de aplicación. La página pública lee `siteSettings/public`, por lo que el modo y los conteos se ven en todos los dispositivos.

## V18 — Modos especiales completos
- Halloween, Navidad, San Valentín y Cumpleaños ahora tienen decoración CSS propia (sin emojis flotando en la parte superior).
- Cada modo cambia automáticamente a su pista MP3 incluida en el proyecto.
- El modo global se aplica a la pantalla de bienvenida y a visitantes invitados porque se lee de `siteSettings/public` antes de entrar al contenido.
- Los conteos regresivos se renderizan siempre desde Firestore y ya no se pisan con los valores por defecto al iniciar la página.
- Cambiar el modo o el título ya no sobrescribe accidentalmente los conteos guardados.

### V27
- Corregido el botón **Agregar conteo**: ahora abre el formulario de forma inmediata aunque Firebase todavía esté inicializando.
