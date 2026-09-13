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

### Apple

A 90 Files ya tiene soporte de código para Apple. Para activarlo hacen falta Apple Developer, App ID/Services ID y la clave de firma correspondiente. El secreto de Apple para OAuth web debe renovarse periódicamente según las reglas de Apple.

### Instagram

No se expone como inicio de sesión general funcional para cuentas personales. La integración oficial actual de Meta para Instagram Login está orientada a cuentas profesionales (Business/Creator). La interfaz lo identifica como opción limitada en lugar de simular un acceso que no funcionaría para la mayoría de usuarios.

## Seguridad

- Nunca guardar Client Secrets en GitHub, JavaScript del navegador ni `wrangler.jsonc`.
- Los secretos solo se introducen en el proveedor correspondiente y en Supabase.
- La sesión de A 90 Files usa cookies `HttpOnly`, `Secure` y `SameSite=Lax`.
- OAuth usa PKCE y un estado de retorno limitado a rutas internas.
- No publicar capturas que muestren secretos. Si ocurre, rotarlos inmediatamente.
