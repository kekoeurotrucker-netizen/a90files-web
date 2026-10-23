# SEO y visibilidad de A90 Files — 23 octubre 2026

## Estado comprobado
- Sitio: https://a90files-web.a90files.workers.dev/
- Repositorio: kekoeurotrucker-netizen/a90files-web, rama principal main.
- El 23/10/2026 el sitio responde y /sitemap.xml en producción devuelve 404; se ofrece robots.txt autogenerado por Cloudflare.
- En analytics_events se registraron 167 page_view, 77 session_id distintos en 30 días y el último evento fue el 08/10/2026: **las visitas actuales y su procedencia no se pueden deducir** de esos datos. Las pruebas propias y familiares pueden contaminar las cifras.
- No existe evidencia suficiente para afirmar indexación o desindexación total de Google sin Search Console.

## Prioridad 0: medir antes de celebrar visitas
1. Investigar por qué /assets/analytics.js y /api/analytics/event dejaron de generar eventos registrados el 08/10; comprobar con una prueba controlada, etiquetarla y excluirla del informe.
2. Configurar Google Search Console como propiedad URL-prefix del origen público y Bing Webmaster Tools; verificación de titularidad y envío del sitemap requieren cuenta autorizada.
3. Añadir un filtro de visitas internas de desarrollo y un panel que separe orgánico, redes sociales, directo y referido mediante UTM/referrer (sin almacenar datos personales innecesarios).
4. Registrar semanalmente: impresiones, clics, CTR, consultas y URLs indexadas (Search Console), sesiones reales, fuentes y clics hacia apps (analítica web).

## Prioridad 1: indexación
- Publicar y comprobar HTTP 200 y text/plain en /robots.txt, XML válido en /sitemap.xml y URLs canónicas de portada, Software, Juegos, Novedades y VaultPool.
- Verificar que cada URL listada responde 200, que la página ofrece texto sin exigir JavaScript y que no contiene noindex. Revisar versiones /en/ y hreflang; ampliar el sitemap con URLs inglesas únicamente tras la validación de su contenido y estado.
- Mantener bloqueados /api/ y /admin/; no indexar páginas privadas, perfiles de usuarios, búsquedas internas ni endpoints de autenticación.
- Recordar que un sitemap facilita el descubrimiento pero no garantiza indexación ni ranking.

## Prioridad 2: búsquedas útiles, no contenido de relleno
Páginas de intención:
1. VaultPool: almacenamiento multinube Windows, compatibilidad y funciones reales.
2. KookiKeeper: restaurar sesiones y cookies en navegadores, siempre indicando qué está disponible y qué sigue en desarrollo.
3. Metal Gear MSX2: investigación técnica de la versión original 1987, pruebas MSX2 / Windows, preservación no oficial y límites de derechos de autor.
4. Marea Studio: creación musical con IA, versión Store y guías.
5. AutoMiner: funcionamiento, requisitos y optimización documentada.

Cada página: título singular, descripción honesta, H1 claro, capturas reales con texto alternativo, enlaces internos, versión/estado y preguntas frecuentes basadas en dudas reales.

Cadencia propuesta: 2 artículos originales útiles por semana. Antes de redactar: identificar consulta de búsqueda, intención y fuentes/evidencias. Evitar SEO automático a escala, plagios, falsa disponibilidad y titulares engañosos.

## Prioridad 3: convertir X en canal de descubrimiento
- @a90files es el canal social activo de difusión; combinar humor canalla con mini-hilos técnicos y capturas verificadas.
- Usar enlaces rastreables a la web cuando el post aporta una razón para entrar, no llenar cada publicación de links.
- Ejemplos: capturas comparativas de Metal Gear MSX2, investigación de compatibilidad multinube, errores corregidos realmente en KookiKeeper.
- Métricas: clics de X a web, lectores que navegan a otra página, interés en descargas. No confundir impresiones de X con tráfico web.

## Criterio de aceptación
No declarar la tarea completa hasta comprobar publicación efectiva de sitemap/robots en el Worker, informe de indexación desde Search Console y capacidad de medición real. Todo despliegue debe conservar copia/referencia de reversión y validación funcional del foro/autenticación.
