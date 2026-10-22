# A 90 Files · autenticación social

## URLs de producción

- Web: `https://a90files-web.a90files.workers.dev/`
- Callback interno de A 90 Files: `https://a90files-web.a90files.workers.dev/api/auth/oauth/callback`
- Callback OAuth de Supabase para los proveedores externos: `https://ugwdxcmmxeqzoxgdofkd.supabase.co/auth/v1/callback`

## Supabase · URL Configuration

En **Authentication → URL Configuration**:

- Site URL: `https://a90files-web.a90files.workers.dev/`
- Redirect URLs permitidas:
  - `https://a90files-web.a90files.workers.dev/api/auth/oauth/callback`
  - `https://a90files-web.a90files.workers.dev/`

No usar wildcards si no son necesarios.

## Proveedores

La web detecta automáticamente qué proveedores están realmente habilitados en Supabase. Un botón social solo inicia OAuth cuando el proveedor aparece activo en `/auth/v1/settings`.

### GitHub

- Estado: aplicación OAuth creada.
- Callback configurado en GitHub: `https://ugwdxcmmxeqzoxgdofkd.supabase.co/auth/v1/callback`
- En Supabase: activar GitHub y guardar Client ID + Client Secret.
- Un secreto que haya aparecido en una captura debe revocarse y sustituirse.

### Google

Crear credenciales OAuth 2.0 de tipo Web en Google Cloud y usar el callback de Supabase. Guardar Client ID + Client Secret solo en Supabase.

### Discord

Crear una aplicación en Discord Developer Portal, añadir el callback de Supabase y guardar Client ID + Client Secret en Supabase.

### Facebook

Crear una app en Meta for Developers, configurar Facebook Login para web y usar el callback de Supabase. Las políticas/URLs públicas exigidas por Meta deben estar disponibles antes de producción.

### X

Usar **X / Twitter OAuth 2.0**, no el proveedor OAuth 1.0a legado. Configurar el callback de Supabase y guardar Client ID + Client Secret en Supabase.

### Instagram

No se expone como inicio de sesión general funcional para cuentas personales. La integración oficial actual de Meta para Instagram Login está orientada a cuentas profesionales (Business/Creator). La interfaz lo identifica como opción limitada en lugar de simular un acceso que no funcionaría para la mayoría de usuarios.

## Seguridad

- Nunca guardar Client Secrets en GitHub, JavaScript del navegador ni `wrangler.jsonc`.
- Los secretos solo se introducen en el proveedor correspondiente y en Supabase.
- La sesión de A 90 Files usa cookies `HttpOnly`, `Secure` y `SameSite=Lax`.
- OAuth usa PKCE y un estado de retorno limitado a rutas internas.
- No publicar capturas que muestren secretos. Si ocurre, rotarlos inmediatamente.

## Comprobación real de producción — 20/10/2026

Consultada la ruta pública `/api/auth/providers` (el antiguo endpoint adicional de Apple se retirará):

| Método | Estado | Para completarlo |
|---|---|---|
| Correo | Activo | Mantener envío de confirmaciones y recuperación de cuentas. |
| Google | Activo | Comprobar login de extremo a extremo con una cuenta de pruebas. |
| GitHub | Activo | Comprobar login de extremo a extremo con una cuenta de pruebas. |
| Discord | Pendiente | Completar el onboarding del Developer Portal, crear aplicación de tipo OAuth2, establecer callback Supabase y configurar client ID y secret en Authentication → Providers. |
| Facebook | Pendiente | Activar cuenta Meta for Developers, crear app, configurar Facebook Login para web y política de privacidad. |
| X | Pendiente | Completar acceso al X Developer Portal, crear proyecto/app **OAuth 2.0**, registrar callback y rellenar credenciales X OAuth2 en Supabase. |
| Instagram | No se ofrece | No es un método de login general para usuarios personales. |

**El backend comprueba la activación real de cada proveedor**. El formulario de A 90 Files oculta las opciones no operativas. Los códigos de correo son verificaciones temporales y no reemplazan el registro oficial de aplicaciones OAuth. No declarar ningún proveedor como disponible hasta que cambie su estado en Supabase y se valide un inicio y cierre de sesión reales.

**Precaución sobre X:** el indicador `external.twitter` corresponde al antiguo flujo OAuth 1.0a y **no** habilita el proveedor `x` de OAuth 2.0. La web exige `external.x===true`, coherente con la llamada a `/auth/v1/authorize?provider=x`. No reutilizar credenciales OAuth1 en la configuración OAuth2.

## Actualización operativa — 22/10/2026

- **Discord:** la aplicación **a90 files** ya existe en Discord Developer Portal (Client ID público `1562249193081405510`). Callback de Supabase configurado. Para obtener un Client Secret válido se inició el proceso de renovación, pero Discord exige MFA de la cuenta: autenticador o código al móvil. No se ha completado esa verificación ni se ha activado Discord en Supabase. No copiar secretos a este repositorio.
- **X / Twitter:** preparado el formulario inicial del programa de desarrolladores (nombre A90 Files y descripción de uso para login exclusivamente). No se envió ni se aceptaron los acuerdos legales. Es imprescindible una aplicación OAuth **2.0** con Client ID/Secret nuevos; no usar las claves antiguas de Twitter 1.0a. Documentación oficial: https://supabase.com/docs/guides/auth/social-login/auth-twitter.
- **Facebook:** falta completar el registro/autenticación en Meta for Developers y crear una aplicación con Facebook Login para web. No hay credenciales OAuth.
- **Supabase:** proyecto `a90files-forum`, ID `ugwdxcmmxeqzoxgdofkd`. Conectar proveedores en Authentication → Sign In / Providers. Los secretos se guardan solo en Supabase, nunca en Git ni en texto público.
- **Producción:** correo, Google y GitHub habilitados; Discord, Facebook y X deshabilitados. Google/GitHub producen inicio PKCE y los cuatro restantes fallan cerrados; falta prueba interactiva real de cada proveedor al habilitarlo.
- **Seguridad:** ninguna verificación MFA, CAPTCHA o aceptación de términos de terceros debe automatizarse sin intervención del titular.

### Prueba read-only de los proveedores

Ejecutar con Node 18+ desde el repositorio:

```bash
node scripts/check-oauth-readiness.mjs
```

Comprueba estado de proveedor, rutas y redirecciones OAuth, PKCE y error controlado de proveedores inactivos. No inicia sesión, no sigue redirecciones ni registra cookies. Al activar un proveedor, repetir esta prueba y después completar inicio y cierre de sesión interactivos.


## Decisión de producto — 22/10/2026

**Apple retirado por decisión del propietario.** No se ofrecerá Sign in with Apple ni se mantendrá el flujo OAuth especial de Apple. Se retira el módulo backend `src/oauth-extra.js`, el script frontend `public/assets/auth-extra.js` y su inclusión en la web. El comprobador de proveedores deja de probar Apple. El código sigue admitiendo correo, Google, GitHub, Discord, Facebook y X, según su activación real en Supabase.

**X:** formulario de registro de desarrollador cumplimentado con nombre y uso de login OAuth2. Pendiente de lectura/aceptación de términos por el titular y de crear la aplicación OAuth2; no enviar el formulario automáticamente.

**Facebook:** pendiente de iniciar sesión/alta en Meta for Developers y crear una aplicación para Facebook Login con callback `https://ugwdxcmmxeqzoxgdofkd.supabase.co/auth/v1/callback`.

**Discord:** guardar el Client ID y secreto en Supabase no garantiza que Auth lo aplique. El panel llegó a mostrar ENABLED, pero las pruebas públicas `external.discord` siguen indicando false; verificar más adelante, sin declarar operativo el acceso.

## Verificación OAuth 2.0 — 22/10/2026 (actualización)

- **X**: alta de desarrollador completada en la cuenta A90 Files; aplicación de X número `33564577` configurada como aplicación web confidencial, con permisos mínimos de lectura, petición de correo y callback `https://ugwdxcmmxeqzoxgdofkd.supabase.co/auth/v1/callback`. Se guardaron Client ID y Client Secret **solo en Supabase**, no en GitHub. El panel ya muestra X OAuth 2.0 habilitado.
- **Detección de X**: la respuesta pública de Supabase `/auth/v1/settings` puede omitir `external.x` aun cuando `/auth/v1/authorize?provider=x` redirige correctamente a `https://x.com/i/oauth2/authorize`. La web valida ese flujo OAuth 2.0 con PKCE y `redirect: manual` antes de mostrar el botón, en lugar de confiar en el indicador legado `external.twitter`. Si la comprobación falla, el proveedor sigue deshabilitado.
- **Discord**: la API pública de A 90 Files ya confirma Discord habilitado y el inicio de PKCE redirige a Supabase. Falta prueba humana completa de inicio y cierre de sesión.
- **Facebook**: permanece pendiente la autenticación en Meta for Developers y la creación/configuración de la aplicación.
- **Apple**: retirado del producto por decisión del propietario.
- Las páginas públicas de privacidad y aviso legal utilizadas en X están disponibles, pero el aviso legal aún contiene datos de identificación del titular pendientes de completar antes de considerar la documentación legal definitiva.
