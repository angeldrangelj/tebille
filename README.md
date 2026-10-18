# Tebille

**Tus gastos, ingresos, saldo y tarjetas de crédito en un solo lugar.**

Tebille es una aplicación web de finanzas personales pensada para Colombia (pesos colombianos, bancos y tasas locales). Funciona en el navegador, se instala en el celular como una app (iPhone y Android) y sigue funcionando sin internet.

👉 **Pruébala:** https://tebille.pages.dev

## Qué hace

- **Gastos e ingresos** por categoría, con resumen mensual: cuánto entró, cuánto salió y cuánto ahorraste.
- **Saldo actual**: escribes cuánto dinero tienes una vez y la app lo mantiene al día con cada movimiento.
- **Presupuesto mensual** con avisos al acercarte al límite.
- **Tarjetas de crédito**: deuda, cupo, cuánto destinar cada mes según el plazo e intereses estimados. La tasa de cada banco se llena sola con **datos oficiales de la Superintendencia Financiera** (datos abiertos, actualizados cada semana) y avisa si una tasa supera la tasa de usura.
- **Sincronización en la nube** con inicio de sesión (Google o correo): los datos se ven en todos los dispositivos.
- **Atajo del iPhone** (Jellycuts / Atajos) para anotar un gasto o ingreso desde el Centro de control sin abrir la app.
- **Accesos directos en Android** ("Anotar gasto" / "Anotar ingreso") y **APK** instalable.
- **Copia de seguridad**: exportar e importar los datos en un archivo.

## Tecnología

| Parte | Herramienta |
|---|---|
| App | HTML, CSS y JavaScript sin frameworks, instalable como PWA (`mis-gastos-app/`) |
| Datos en la nube e inicio de sesión | Firebase Authentication + Cloud Firestore |
| Seguridad de datos | Reglas de Firestore (`firestore.rules`): cada persona solo ve sus datos |
| Hosting y funciones | Cloudflare Pages + Pages Functions (`functions/api/`) |
| Tasas de tarjetas | API de datos abiertos de datos.gov.co (Superintendencia Financiera) |
| Android | Trusted Web Activity generada con PWABuilder |
| Atajo del iPhone | Jelly / Jellycuts (`atajo-tebille.jelly`) |

### Estructura

```
mis-gastos-app/        App web (lo que se publica)
  index.html           Toda la app: interfaz y lógica
  sw.js                Service worker (funciona sin internet)
  manifest.webmanifest Datos para instalarla como app
  .well-known/         Verificación de la app de Android
functions/api/         Funciones en Cloudflare
  gasto.js             Recibe gastos/ingresos desde el atajo del iPhone
  categorias.js        Lista de categorías para el atajo
  tasas.js             Tasas de tarjetas por banco (Superfinanciera)
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

## Autor

**Angel Rangel** — estudiante de Ingeniería de Software en la UDES (Universidad de Santander), tercer semestre. Hecho en Colombia.

- Instagram: [@angeldrangelj](https://instagram.com/angeldrangelj)

## Desarrollo con inteligencia artificial

Este proyecto lo desarrollé con la ayuda de **Claude** (de Anthropic), usando mi suscripción **Claude Pro** a través de **Claude Code**. Yo definí la idea, las funciones, el diseño de lo que necesitaba y probé todo en mis dispositivos; Claude me ayudó a escribir el código, configurar los servicios (Firebase, Cloudflare, Netlify) y resolver errores en el camino.

## Licencia

© 2026 Angel Rangel. Todos los derechos reservados.
