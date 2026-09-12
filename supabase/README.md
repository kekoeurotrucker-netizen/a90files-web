# A 90 Files · Supabase / Foro

## Jerarquía de usuarios

| Rol | Capacidades previstas |
| --- | --- |
| `user` | Leer, crear temas/respuestas, editar contenido propio, reaccionar y reportar. |
| `moderator` | Todo lo anterior + moderar contenido, cerrar/mover temas, ocultar/restaurar mensajes y gestionar reportes. Sin acceso a configuración sensible ni roles. |
| `admin` | Todo lo anterior + categorías, sanciones y gestión de moderadores. Solo puede cambiar `user` ↔ `moderator`. No puede crear admins ni tocar super admins. |
| `super_admin` | Control total de administración, seguridad y roles. Solo un super admin puede crear o degradar admins/super admins. |

## Reglas de seguridad

- Todo usuario nuevo nace como `user`; OAuth nunca decide el rol.
- Los roles viven en `public.user_roles`, separados del perfil editable.
- El cliente no puede escribir directamente en `user_roles`.
- Los cambios de rol pasan por `public.set_user_role(...)`, que comprueba la jerarquía en servidor.
- Un usuario no puede cambiar su propio rol desde la aplicación.
- Un `admin` no puede crear otro `admin` ni un `super_admin`.
- Cada cambio de rol queda registrado en `public.role_audit_log`.
- RLS está activado desde la primera migración.
- No se guardan email, tokens OAuth ni secretos en las tablas públicas del foro.
- Nunca se debe usar `service_role` en JavaScript, HTML, GitHub o Cloudflare público.

## Primer super admin

El primer `super_admin` se debe crear una sola vez desde el panel seguro de Supabase/SQL Editor después de que exista la cuenta del propietario. No se implementará ningún endpoint público de “bootstrap”, porque sería una vía de escalada de privilegios.

Cuando esté creada la cuenta A 90 Files, obtener su UUID desde **Authentication → Users** y ejecutar manualmente, desde el SQL Editor autenticado del propietario:

```sql
update public.user_roles
set role = 'super_admin'::public.app_role,
    assigned_by = null,
    assigned_at = now()
where user_id = 'UUID-DE-LA-CUENTA-A90';
```

Después de esto, todos los cambios futuros de roles deben hacerse mediante la función controlada `public.set_user_role` y el panel de administración.

## Credenciales que NO deben compartirse

No subir ni pegar en chats, commits o frontend:

- contraseña de base de datos;
- `service_role` key;
- JWT secret;
- secretos OAuth de Google/Facebook/X/Discord/GitHub;
- claves privadas de cualquier proveedor.

El frontend solo necesitará la URL pública del proyecto y la clave pública/publishable (`anon` o publishable key, según el formato que muestre Supabase). Los secretos se quedan únicamente en el backend/configuración segura.
