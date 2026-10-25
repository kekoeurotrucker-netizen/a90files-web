# Notas de versión — VaultPool Storage 3.0.11 (Windows x64)
**25 de octubre de 2026 · A 90 Files · Notas oficiales · comentarios desactivados**

## Cambios de esta entrega
- **Subir archivo** y **Subir carpeta** pasan por los selectores nativos de Windows y facilitan las rutas elegidas al motor, sustituyendo la ruta anterior que daba errores de comunicación.
- Se conservan las mejoras de **3.0.10** en **Archivos → Mantenimiento**:
  - Apartar registros cuya eliminación remota continúa pendiente, sin marcarlos como eliminados en las nubes.
  - Mantener claves y manifiestos locales mientras el registro está apartado.
  - Selección múltiple, confirmación, reintento de limpieza, cancelación y opción de devolver registros a Archivos.
- **MEGA no forma parte de los conectores activos** de esta edición.

## Lo que esta publicación NO certifica
- Sigue pendiente una validación completa de subida y recuperación con proveedores reales en el entorno final de Windows. Una prueba de selector no equivale a prueba extremo a extremo.
- La recuperación requiere metadatos y claves válidas, además de suficientes fragmentos accesibles. Conserva copias antes de borrar originales.
- La unidad virtual es una abstracción sobre el almacenamiento administrado; no equivale a un SSD local ni garantiza uso offline.
- La integración completa con Android sigue en revisión, no está certificada.
- El producto está disponible en **Microsoft Store**, pero no está confirmada la distribución de la versión **3.0.11** en ese canal; comprueba la versión allí.

## Descarga y documentación
- **Artículo y explicación completa:** https://a90files-web.a90files.workers.dev/novedades/vaultpool-3-0-11-multinube-espacio-gratis-windows/
- **Instalador, portable y Store:** https://a90files-web.a90files.workers.dev/descargas/#vaultpool
- **Microsoft Store:** https://apps.microsoft.com/detail/9pkv54mw4gz6
- **Guías:** https://a90files-web.a90files.workers.dev/foro/vaultpool-guias/
- **Errores y feedback (comentarios abiertos allí):** https://a90files-web.a90files.workers.dev/foro/vaultpool-feedback/

> Descargas directas sin firma comercial: Windows puede mostrar advertencias. No recomendamos desactivar Smart App Control ni otras protecciones.

**Este hilo debe publicarse en la categoría oficial “Notas de versión” y permanecer cerrado a comentarios.** Para conversar está Feedback / Soporte.

---
**Control previo de publicación (solo CM; eliminar esta sección del post final):**
- Verificar el hash de los *archivos descargados desde los enlaces públicos*, no solo los archivos originales locales.
- El instalador original de 77.404.200 bytes tiene SHA-256 `8DD332EDB801F35D7E538DAF08504068D9EB159E3249FCC353687C826B7D3EB0`.
- El portable original de 88.899.258 bytes tiene SHA-256 `261E66E6825C31FB350DBBFA14E52248E7DA3702CF1A5EB85CCF196686293E1F`.
- El ID de Drive del portable actualmente identifica un ZIP llamado `*.vaultpool-folder.zip` de 92.193.605 bytes, por tanto **NO COINCIDE** con el portable original. Investigar antes de publicarlo.
