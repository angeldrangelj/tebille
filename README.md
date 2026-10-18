<p align="center">
  <img src="mis-gastos-app/icons/icon-512.png" alt="Logo de Tebille" width="140">
</p>

<h1 align="center">Tebille</h1>

<p align="center"><b>Tus gastos, ingresos, saldo y tarjetas de crédito en un solo lugar.</b></p>

<p align="center"><a href="https://tebille.pages.dev">tebille.pages.dev</a></p>

Tebille es una aplicación web de finanzas personales pensada para Colombia (pesos colombianos, bancos y tasas locales). Funciona en el navegador, se instala en el celular como una app (iPhone y Android) y sigue funcionando sin internet.

👉 **Pruébala:** https://tebille.pages.dev

## Qué hace

- **Gastos e ingresos** por categoría, con resumen mensual: cuánto entró, cuánto salió y cuánto ahorraste.
- **Saldo actual**: escribes cuánto dinero tienes una vez y la app lo mantiene al día con cada movimiento.
- **Presupuesto mensual** con avisos al acercarte al límite.
- **Tarjetas de crédito**: deuda, cupo, cuánto destinar cada mes según el plazo e intereses estimados. La tasa de cada banco se llena sola con **datos oficiales de la Superintendencia Financiera** (datos abiertos, actualizados cada semana) y avisa si una tasa supera la tasa de usura.
- **Sincronización en la nube** con inicio de sesión (Google o correo): los datos se ven en todos los dispositivos.
- **Atajo del iPhone** (Jellycuts / Atajos) para anotar un gasto o ingreso desde el Centro de control sin abrir la app.
- **App de Android (APK)** que se instala como cualquier app, con accesos directos "Anotar gasto" / "Anotar ingreso" en el ícono. Descárgala en https://tebille.pages.dev/descargas/Tebille.apk (Android 7.0 o más reciente).
- **Instalación en iPhone** guiada paso a paso dentro de la app (☰ → Instalar en iPhone).
- **Copia de seguridad**: exportar e importar los datos en un archivo.

## Tecnología

| Parte | Herramienta |
|---|---|
| App | HTML, CSS y JavaScript sin frameworks, instalable como PWA (`mis-gastos-app/`) |
| Datos en la nube e inicio de sesión | Firebase Authentication + Cloud Firestore |
| Seguridad de datos | Reglas de Firestore (`firestore.rules`): cada persona solo ve sus datos |
| Hosting y funciones | Cloudflare Pages + Pages Functions (`functions/api/`) |
| Tasas de tarjetas | API de datos abiertos de datos.gov.co (Superintendencia Financiera) |
| Android | Trusted Web Activity generada con [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap) (`android-app/`) |
| Atajo del iPhone | Jelly / Jellycuts (`atajo-tebille.jelly`) |

### Estructura

```
mis-gastos-app/        App web (lo que se publica)
  index.html           Toda la app: interfaz y lógica
  sw.js                Service worker (funciona sin internet)
  manifest.webmanifest Datos para instalarla como app
  _headers             Encabezados para Cloudflare (APK, verificación de Android)
  .well-known/         Verificación de la app de Android (assetlinks.json)
  descargas/           APK de Android listo para descargar
functions/api/         Funciones en Cloudflare
  gasto.js             Recibe gastos/ingresos desde el atajo del iPhone
  categorias.js        Lista de categorías para el atajo
  tasas.js             Tasas de tarjetas por banco (Superfinanciera)
android-app/           Configuración de la app de Android (twa-manifest.json de Bubblewrap)
scripts/               construir-apk.ps1: construye el APK en Windows
firestore.rules        Reglas de seguridad de la base de datos
atajo-tebille.jelly    Plantilla del atajo del iPhone
netlify/, netlify.toml Versión anterior del hosting (Netlify)
```

### Publicar

```bash
wrangler pages deploy mis-gastos-app --project-name tebille --branch main
firebase deploy --only firestore:rules
```

Cada vez que cambies la app, sube el número de `VERSION` en `sw.js` y `APP_VERSION` en `index.html` para que los celulares descarguen la versión nueva.

> La configuración de Firebase que aparece en el código (`apiKey`, etc.) es pública por diseño en las apps web; la protección de los datos está en `firestore.rules`.

### App de Android

La app de Android es una *Trusted Web Activity*: abre `tebille.pages.dev` a pantalla completa, así que los cambios de la web le llegan solos. Solo hay que volver a construirla si cambian el nombre, el ícono, los colores o los accesos directos.

Requisitos: Node.js y Bubblewrap (`npm install -g @bubblewrap/cli`). La primera vez, Bubblewrap ofrece instalar Java (JDK 17) y el Android SDK.

1. **Crear el proyecto** (solo la primera vez), en una carpeta **sin espacios** en la ruta:
   ```bash
   bubblewrap init --manifest https://tebille.pages.dev/manifest.webmanifest
   ```
   Usa el identificador `com.tebille.app`. La configuración actual está en `android-app/twa-manifest.json` (Android 7.0+, `minSdkVersion` 24).
2. **Construir** con el script, que además arregla el error de Windows *"gradlew.bat no se reconoce"*:
   ```powershell
   powershell -ExecutionPolicy Bypass -File scripts\construir-apk.ps1 -Proyecto C:\ruta\al\proyecto
   ```
   Bubblewrap pide las contraseñas de la llave y genera `app-release-signed.apk` y `app-release-bundle.aab` (para Google Play).
3. **Publicar**: copia el APK a `mis-gastos-app/descargas/Tebille.apk` y publica el sitio. Si la llave cambia, actualiza la huella SHA-256 en `mis-gastos-app/.well-known/assetlinks.json`.

> 🔒 La llave de firma (`*.keystore`) y sus contraseñas **no están en este repositorio** a propósito (ver `.gitignore`). Sin ellas no se pueden publicar actualizaciones de la app.

## Autor

**Angel Rangel** — estudiante de Ingeniería de Software en la UDES (Universidad de Santander), tercer semestre. Hecho en Colombia.

- Instagram: [@angeldrangelj](https://instagram.com/angeldrangelj)

## Desarrollo con inteligencia artificial

Este proyecto lo desarrollé con la ayuda de **Claude** (de Anthropic), usando mi suscripción **Claude Pro** a través de **Claude Code**. Yo definí la idea, las funciones, el diseño de lo que necesitaba y probé todo en mis dispositivos; Claude me ayudó a escribir el código, configurar los servicios (Firebase, Cloudflare, Netlify), generar la app de Android y resolver errores en el camino.

## Licencia

© 2026 Angel Rangel. Todos los derechos reservados.
