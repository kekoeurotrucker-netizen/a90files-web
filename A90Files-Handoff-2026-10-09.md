# A90 Files — Handoff 2026-10-09

Este documento sirve para continuar el desarrollo en un chat nuevo sin perder el contexto de la conversación actual ni el estado previo importante del proyecto.

## 1. Proyecto y flujo de trabajo

Repositorio:
- GitHub: `kekoeurotrucker-netizen/a90files-web`
- Rama: `main`
- Producción: `https://a90files-web.a90files.workers.dev/`
- Supabase project ref: `ugwdxcmmxeqzoxgdofkd`
- Supabase project name: `a90files-forum`

Forma de trabajar:
- El usuario quiere cambios reales en la web, no mockups ni explicaciones largas.
- Cuando diga “hazlo”, modificar el proyecto directamente.
- Si manda una captura, interpretar el problema visual y tocar CSS/HTML/JS real.
- Preguntar solo si hay una acción manual o de credenciales realmente inevitable.
- Preservar lo aprobado; evitar rediseños globales innecesarios.
- No generar imágenes para resolver ediciones web.
- No tocar el favicon global A90 con iconos de proyectos.

## 2. Branding global aprobado

A90 Files:
- favicon global: `public/favicon.ico` — siempre A90.
- cabecera “A90 velocity” aprobada.
- estilo general oscuro petrol/cian con acentos ámbar.
- social rail centrado bajo footer, fuera del footer:
  - `public/assets/social-global.css`
  - `public/assets/social-global.js`
  - `public/index.html`
  - `src/main.js`
- footer legal global:
  - © [year] A 90 Files · Todos los derechos reservados.
  - enlaces: Aviso legal, Privacidad, Cookies, Licencias.

## 3. Legal y analítica

Centro legal creado:
- `/aviso-legal/`
- `/privacidad/`
- `/cookies/`
- `/licencias/`

Pendiente por no inventar:
- titular legal / razón social o nombre completo
- NIF/CIF
- domicilio legal/profesional

Contacto:
- `a90files@gmail.com`

Analítica:
- `public/assets/analytics.js`
- first-party, Supabase `analytics_events`
- no IP, no User-Agent, no user ID autenticado.
- retención ~25 meses mediante migración `20261007_003_analytics_retention.sql`.
- no GA / Meta Pixel / TikTok Pixel actualmente.
- no añadir banner de consentimiento mientras no haya tracking no exento.

## 4. Auth / seguridad / cuenta A90

SMTP personalizado de Supabase ya configurado manualmente por el usuario.
No volver a abrir/copiar/transcribir secretos, passwords ni credenciales.
No automatizar CAPTCHA Turnstile.

Turnstile:
- obligatorio en login/signup/resend.

MFA:
- solo Super Admin.
- no obligar a usuarios normales a authenticator.

Avatar:
- bucket `a90-avatars`
- resuelto con migraciones:
  - `20261007_001`
  - `20261007_002`

### Cabecera autenticada
Bug corregido:
- cuando hay sesión, la cabecera debe mostrar avatar + nombre (`A90Admin` en el usuario actual), NO “Entrar”.
- la causa era `$('[data-a90-account]').forEach(...)` en `public/assets/auth.js`.
- la corrección real debe quedar como:
  `$$('[data-a90-account]').forEach(...)`
- commit clave de corrección: `c517526305d73a7374a9c3cfa12e6555b8c19938`
- versión auth actual usada por `app.js`: `20261009-account-header-fix-4`.

No reintroducir el selector de un solo elemento.

## 5. Menú Software — estado actual

El desplegable superior de Software tiene actualmente:
- VaultPool Storage
- AutoMiner
- StartWise
- Marea Studio

Iconos reales:
- VaultPool: `/assets/vaultpool/vaultpool-icon-20261005.png?v=1`
- AutoMiner: `/assets/autominer/autominer-icon.webp`
- StartWise: `/assets/startwise/startwise-icon.svg`
- Marea: `/assets/marea/marea-icon.webp?v=20261005-marea-fixed-2`

StartWise enlaza de momento a:
- `/novedades/startwise-en-desarrollo/`
porque no existe `/software/startwise/`.

### Dirección visual pedida
Usuario quiere:
- elegante y sobrio, NO neón exagerado.
- marco cian→ámbar “A90” tanto en:
  - recuadro grande del desplegable
  - recuadros pequeños de cada icono
- interior oscuro.
- iconos bien centrados y con aire.
- que el degradado sea visible de verdad, no tan sutil que parezca igual.

Último cambio aplicado:
- commit de código: `6e7c5c8393812c9d8ba6be0a56a14af04294e758`
- mensaje: `style(nav): add A90 cyan-amber framing to software menu`
- Production smoke tests ✅
- Secret leak guard ✅
- `software-menu.css?v=20261009-gradient-frame-1`
- `APP_BUILD='20261009-gradient-frame-1'`

Además hubo iteraciones previas:
- `43bbafc2089b...` premium visible
- `1f8a81244cce...` sobrio
- `3deb458330d5...`, `3f7ee65ff438...`, `c2ded6d6380b...` extendieron marcos A90
No revertir el concepto final cian→ámbar.

## 6. Homepage / Novedades

Carrusel de portada:
- máximo 10 items.
- no rellenar artificialmente hasta 10.
- contador refleja el número real.
- actualmente hay 8 slides y muestra `01 / 08`.
- sin botón de pausa.
- “Ver más noticias” debe activarse solo cuando corresponda según el total histórico; la idea es que el slider mantenga solo las noticias seleccionadas/reales, no relleno histórico.

Marea es actualmente la slide principal:
- “Menos botones. Más estudio.”
- artículo: `/novedades/marea-studio-editor-pistas/`

VaultPool spotlight:
- 1.30.16.0 · Store
- no degradar ni cambiar el icono aprobado.

## 7. VaultPool — estado web

Última versión pública:
- VaultPool Storage MultiTool 1.30.16.0
- Windows x64
- Microsoft Store ID: `9PKV54MW4GZ6`

Artículo:
- `/novedades/vaultpool-1-30-16-store/`

Páginas actualizadas:
- `/software/vaultpool/`
- `/software/vaultpool/ficha/`
- `/actualidad/vaultpool-microsoft-store/`
- `/descargas/`
- `/software/`

No anunciar como completado:
- sync completo Windows↔Android
- recuperación automática cross-device
- interoperabilidad Windows/Android validada
- R2 budget completo

Android sigue en desarrollo.

## 8. Marea Studio — estado y artículo

Artículo actual:
- `public/novedades/marea-studio-editor-pistas/index.html`
- URL: `/novedades/marea-studio-editor-pistas/`
- foro feedback: `/foro/?t=41`
- subforo Marea: `/foro/?c=marea-studio`

Contenido clave del artículo:
- modo simple `Crear` se mantiene sencillo.
- menos opciones expuestas por defecto.
- tempo/ritmo plegados en remix.
- planificador 4B retirado del flujo porque Cover no lo usa.
- remixes largos: más margen de unión y avisos de bajones.
- trabajo por secciones/frases.
- editor de pistas con frases sincronizadas.
- cortar/repetir frases.
- audio importado sin IA.
- generar solo fragmentos.
- build interna 1.3.14.
- portable compacta dev.
- 9 modelos detectados.
- 56 pruebas Python + pruebas UI en esa etapa.
- aún NO es un DAW completo.
- futuro: patrones, instrumentos, plugins/VST.
- se pide feedback explícitamente en foro.

Importante:
- NO mencionar “Music 2000” por nombre.
- si se hace referencia, usar algo como:
  “un pequeño guiño nostálgico a cierto famoso editor musical de consola”.
- el homenaje visual solo va en el editor, NO en toda la app.

Visual del artículo:
- usar `marea-hero-waves.webp`
- evitar la tarjeta central duplicando el logo.
- usuario rechazó los visuales recargados.
- dirección actual: limpia, branding Marea sin texto incrustado excesivo.

## 9. Foro — layout

Cambios recientes:
- al abrir subforo o hilo, el contenido abierto aparece ARRIBA.
- debajo quedan actividad reciente, categorías/subforos, etc.
- se añadió `#forum-live-focus`.
- se eliminó el editor de demostración inferior de la portada.
- no restaurarlo.

## 10. Foro — responder / citar

Semántica aprobada:

### Responder
- “Responder” aparece junto a “Citar” y “Reportar”.
- crea relación real con el mensaje mediante `reply_to_post_id`.
- visualmente muestra:
  “En respuesta a <usuario>”
  + extracto/enlace al mensaje original.
- NO copia el mensaje entero.

### Citar
- citar SOLO si el usuario selecciona un fragmento.
- si pulsa Citar sin selección, mostrar aviso para que seleccione texto.
- una cita no seleccionada del mensaje entero NO debe usarse; para eso está Responder.

### Respuesta general
- no apunta a nadie.
- sale como comentario raíz normal.

Migración:
- `supabase/migrations/20261009_002_forum_direct_replies_user_notifications.sql`
- añade `forum_posts.reply_to_post_id`
- crea `forum_user_notifications`
- trigger `private.forum_notify_direct_interactions()`

## 11. Foro — notificaciones de usuarios

Esto NO tiene nada que ver con staff.

Cuando alguien:
- responde directamente a tu mensaje
- o cita un fragmento de tu mensaje

el usuario afectado recibe notificación en Cuenta A90.

UI:
- contador/badge en botón de cuenta.
- lista “Actividad del foro” dentro del modal de Cuenta A90.
- abrir notificación salta al mensaje.
- marcar leída / marcar todas.

API:
- `GET /api/forum/notifications`
- `POST /api/forum/notifications/read`

Caso real ya aplicado:
- topic 41
- post 40 = DJ Teixo
- post 41 = A90Admin
- post 41 quedó como respuesta directa a post 40
- se quitó la cita completa del cuerpo.
- se creó la notificación real a DJ Teixo con event key:
  `reply:41:40`

No duplicarla.

## 12. Foro — modelo de conversación tipo YouTube

Modelo aprobado:
- mensaje inicial del tema: siempre fijo arriba.
- cada respuesta GENERAL al hilo = “comentario principal”.
- respuestas/citas relacionadas van debajo de ese comentario principal.
- NO árboles infinitos.
- si una respuesta dentro del bloque recibe otra respuesta, sigue en el mismo bloque del comentario raíz.
- respuestas internas en orden cronológico antiguo→nuevo.

Filtros disponibles:
- Más recientes
- Más antiguos
- Más populares

Por defecto:
- `Más recientes`
- `renderConversation(..., mode='newest')`
- `sort.value='newest'`
- `FORUM_BUILD='20261009-newest-comments-1'`

Orden:
- opener fijo arriba.
- comentarios raíz: más recientes primero por defecto.
- respuestas internas: antiguas→nuevas.

### Popularidad
Ponderación aprobada:
- respuesta = 1 punto
- cita = 1 punto
- reacción = 0,25 puntos

Se calcula sobre el bloque de conversación asociado al comentario raíz.

### Colapsado para no hacer hilos infinitos
- referencias/citas largas: ~280 caracteres / ~4 líneas antes de “Ver más”.
- respuestas internas largas: ~700 caracteres / ~8 líneas antes de “Ver más”.
- si hay más de 3 respuestas en un bloque, puede quedar plegado con contador.
- “Ver más / Ver menos” debe mantenerse.

## 13. Foro — categorías y soporte

### Normas y avisos
La categoría contenedora “Normas y avisos” ya NO repite un subforo con el mismo nombre.

Subforos:
- Normas de la comunidad
- Avisos y comunicados
- Cambios y roadmap

Migración:
- `20261009_003_split_rules_notices_subforums.sql`

### Soporte
Bajo categoría Soporte:
- Web y foro
- Soporte VaultPool
- Soporte Marea Studio
- Soporte AutoMiner
- Soporte StartWise
- Soporte Project Trucker

Migración:
- `20261009_004_add_project_support_subforums.sql`

También se compactó el layout del foro para:
- eliminar huecos verticales absurdos causados por grid stretch.
- iconos más pequeños.
- tarjetas más compactas.
- mejor centrado.

## 14. Marea forum thread / feedback

Tema principal de feedback:
- topic 41
- “Marea Studio — feedback, pruebas e ideas para el estudio”

El artículo de Novedades enlaza a ese tema y pide:
- pruebas
- críticas
- ideas
- qué controles sobran
- qué falta
- cómo debería funcionar el remix por partes
- qué herramientas del estudio musical conviene simplificar

## 15. Estado actual de pruebas

Último cambio de UI del menú Software:
- commit `6e7c5c8393812c9d8ba6be0a56a14af04294e758`
- Production smoke tests ✅
- Secret leak guard ✅

Antes de cualquier nueva edición:
1. leer HEAD actual.
2. leer SHA del archivo.
3. hacer cambios sobre la versión actual.
4. cache-bump cuando se modifique JS/CSS global.
5. no afirmar que está publicado hasta comprobar workflows.

## 16. Errores recientes a NO repetir

1. No usar `$('[data-a90-account]').forEach`.
   Debe ser `$$('[data-a90-account]').forEach`.

2. En JavaScript `String.replace`, `$$` en el replacement string se interpreta como un solo `$`.
   Si hay que insertar literalmente `$$`, usar replacement function:
   `() => "$$(...)"`

3. No confiar solo en F5 si se toca CSS/JS global:
   - bump de `APP_BUILD`
   - bump de query de asset
   - si corresponde, actualizar `public/index.html`
   - Worker ya reescribe `app.js` en HTML y usa no-cache/no-store.

4. No rellenar el carrusel de Novedades con contenido histórico solo para llegar a 10.

5. No mezclar notificaciones normales de usuario con notificaciones privadas de staff.

6. No poner el nombre “Music 2000” en textos públicos de Marea.

7. No volver a meter un editor demo al fondo de la portada del foro.

## 17. Siguiente punto natural de trabajo

La última petición visual del usuario era:
- “en el recuadro grande y en los pequeños el cian a ámbar degradado”.

Eso ya se ha aplicado al menú Software.
Si el usuario manda nueva captura, revisar si:
- el borde del contenedor grande se percibe claramente.
- los 4 marcos de icono muestran el degradado cian→ámbar de forma consistente.
- no se ve demasiado neón.
- el interior sigue sobrio y oscuro.

La dirección preferida del usuario: “elegante sobria”.

