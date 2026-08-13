# Auditoría de Seguridad

**Agente:** 4 (Security auditor)  
**Proyecto:** Boxario  
**Fecha:** 2026-08-02  
**Alcance:** secretos, autenticación/autorización, validación, inyección, XSS, CSRF, SSRF, CORS, sesiones, permisos, logs, dependencias y configuración.  
**Modo:** solo lectura del código fuente (sin refactor ni cambios de dependencias).

---

## Metodología

1. Revisión estática de superficie de ataque: `src/proxy.ts`, `src/lib/auth/**`, `src/app/api/**`, `src/app/actions/**`, `next.config.ts`, `src/lib/security/**`, scripts `security-*`, migraciones de endurecimiento y plantillas de entorno.
2. Verificación de presencia de secretos (sin volcar valores): `.env.example`, `.env.local.template`, presencia de `.env.local` (claves listadas, valores redactados).
3. Cruce con controles documentados en tests de regresión (`security-hardening.eval.test.ts`, `security-audit.eval.test.ts`) y gates `scripts/security-catalog-check.mjs` / `scripts/security-release-check.mjs`.
4. `npm audit --omit=dev` para dependencias de producción.
5. Clasificación obligatoria por hallazgo:
   - **Vulnerabilidad confirmada** — explotable con evidencia en código bajo condiciones concretas.
   - **Riesgo probable** — debilidad real con impacto condicionado a configuración, bug colateral o abuso.
   - **Recomendación preventiva** — endurecimiento incremental sin evidencia de explotación actual.

**No se inventaron vulnerabilidades.** Donde el control es sólido, se documenta en “Controles bien implementados”.

**Secretos:** no se imprimen valores. `.env.local` está presente en el workspace; está en `.gitignore` (`.env*` con excepciones de plantillas).

---

## Controles bien implementados

| Área | Evidencia | Comentario |
|------|-----------|------------|
| Gate de sesión | `src/proxy.ts` + `src/lib/auth/proxy-paths.ts` | Paths públicos limitados: `/login`, `/rastrear`, `/api/auth/sign-in`, `/api/public/tracking`. Resto exige usuario vía `getUser()`. Fallo cerrado si faltan URL/anon key (503/redirect). |
| Authn real | `@supabase/ssr` + `resolveAuthUser` | Distingue autenticado / no autenticado / servicio no disponible; limpia cookies `sb-*` en fallos. |
| Authz por ruta | `permissions.ts` + `require.ts` | Default-deny en paths sin catálogo; aislamiento platform-only (`isPlatformOnlySession`); conductor restringido a `/` y `/conductor`; layouts llaman `requirePathAccess` / `requirePlatformPathAccess`. |
| Login | `api/auth/sign-in` | Rate limit multi-eje (IP+email, IP, cuenta) fail-closed; mensaje genérico `"Credenciales invalidas"`; redirect post-login sanitizado. |
| Signup público | `public-signup.ts` + `auth.ts` | Forzado a `false` en `NODE_ENV=production`; en no-prod solo con `ALLOW_PUBLIC_SIGNUP=1`; no otorga platform admin. |
| Bypass de desarrollo | `dev-auth-bypass.ts` + tests | Off en production aunque `DEV_AUTH_BYPASS=1`; exige flag + Supabase local + app local. Release check bloquea el flag. En `.env.local` actual: **DEV_AUTH_BYPASS ausente**. |
| Tracking público | `api/public/tracking` + `public-tracking.ts` | Token regex 40–120; lookup por **hash** SHA-256; expiry + revoke; rate limit; respuesta con iniciales (sin pagos ni teléfonos completos); service_role solo en servidor. |
| Validate-address | `api/validate-address` | Requiere sesión; límite de body/query; rate limit; fetch solo a `maps.googleapis.com` (sin URL controlada por el cliente → sin SSRF clásico); clave `GOOGLE_MAPS_API_KEY` server-side. |
| Conductor upload API | `api/conductor/task-results` | Tope multipart, content-type estricto, errores genéricos + `correlationId`, `Cache-Control: private, no-store`. |
| Imágenes | `safe-image.ts` | Decodifica con `sharp`, formatos permitidos, re-encode WebP (mitiga polyglot/XSS en uploads). |
| Cabeceras HTTP | `next.config.ts` | CSP (enforce en prod), `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy`, `COOP`, HSTS en production. |
| Orígenes / IP | `request-origin.ts`, `request-ip.ts` | `TRUST_PROXY_HEADERS` default off; forwarded origin solo si está en allowlist. En `.env.local`: `TRUST_PROXY_HEADERS=0`. |
| Open redirect | `sanitizeInternalPath` | Rechaza `//`, URLs absolutas y backslash; usado en login/`next`. |
| Postgres / RLS | migraciones `128+`, `security-catalog-check` | Revoke amplio a `anon`; RPCs sensibles solo `service_role`; RLS en tablas críticas; guards de escritura autoritativa; pagos sin INSERT/UPDATE/DELETE a `authenticated`; buckets de fotos no públicos. |
| Release gates | `security-release-check.mjs` | Bloquea release si no-prod, signup público, bypass, scripts de credenciales locales, o falta service role / HTTPS. |
| Secretos en repo | `.gitignore` | `.env*` ignorado; solo plantillas versionadas con claves demo locales de Supabase CLI (conocidas, no secretos de producción). |
| XSS DOM | búsqueda en `src` | Sin `dangerouslySetInnerHTML` / `innerHTML` / `eval`. |
| Dependencias prod | `npm audit --omit=dev` | 0 vulnerabilidades reportadas (info/low/moderate/high/critical = 0) al momento de la auditoría. |
| Guard local-cloud | `supabase/env.ts` `assertLocalOnly` | Impide enlazar accidentalmente un proyecto `*.supabase.co` desde helpers de URL (reduce fuga de service role hacia cloud no intencional en este árbol). |

---

## Hallazgos

### SEC-001 — Escalada a sesión de platform owner con `DEV_AUTH_BYPASS`

| Campo | Valor |
|-------|--------|
| **Clasificación** | Vulnerabilidad confirmada (solo con bypass activo; **no** aplicable si `NODE_ENV=production`) |
| **Severidad** | Alta (condicional a entorno de desarrollo/mal configurado) |
| **Certeza** | Alta |
| **Ubicación** | `src/lib/auth/session.ts` (`requireAppSession` → `getDevelopmentPlatformOwnerSession`); `src/lib/auth/platform.ts` (`requirePlatformAdmin` catch) |
| **Evidencia** | Con bypass ON, si `getAppSession()` devuelve `null` (p. ej. JWT válido sin perfil activo), `requireAppSession` carga el perfil de `PLATFORM_OWNER_EMAIL` con `permissions: ["all"]`. El proxy solo exige `getUser()` autenticado, no perfil. Además, si `requireAppSession` lanza y el bypass está ON, `requirePlatformAdmin` **fabrica** `isPlatformAdmin: true` sin verificar `platform_admins`. |
| **Impacto** | En un entorno no-prod expuesto con `DEV_AUTH_BYPASS=1` y Supabase/app “local” según la heurística, un usuario autenticado sin perfil usable obtiene privilegios de dueño/plataforma en server actions (`requireAppSession` / `requirePlatformAdmin`). |
| **Corrección incremental** | 1) No usar bypass fuera de localhost aislado. 2) En `requireAppSession`, no sustituir por owner si ya hay JWT de otro usuario. 3) Eliminar la fabricación de admin en el `catch` de `requirePlatformAdmin`; exigir fila real en `platform_admins`. 4) Mantener `security:release-check` en el pipeline de deploy. |

**Estado observado:** `DEV_AUTH_BYPASS` **ausente** en `.env.local`; tests confirman bloqueo en production.

---

### SEC-002 — Contraseñas temporales generadas con `Math.random`

| Campo | Valor |
|-------|--------|
| **Clasificación** | Riesgo probable |
| **Severidad** | Media |
| **Certeza** | Alta (código); impacto depende de amenaza de predicción del PRNG |
| **Ubicación** | `src/lib/auth/temporary-password.ts`; `src/lib/organizations/slug.ts` (`generateOrganizationAdminTemporaryPassword`); UI que las ofrece (usuarios, equipo agencia, conductores, wizard platform) |
| **Evidencia** | Ambas funciones usan `Math.random` / `Math.floor(Math.random() * …)` para construir secretos de cuenta. No usan `crypto.randomBytes` / `crypto.getRandomValues` (sí usados en tracking tokens y time-clock). |
| **Impacto** | Contraseñas temporales de alta valor (admins de org, conductores, equipo) con entropía no criptográfica; riesgo mayor si se reutilizan sin forzar cambio y el canal de entrega es débil. |
| **Corrección incremental** | Sustituir el muestreo por CSPRNG (`randomBytes` o `getRandomValues`), conservar alfabetos/contratos de tests; opcional: forzar cambio en primer login. |

---

### SEC-003 — Amplio uso de `service_role` tras authz en aplicación

| Campo | Valor |
|-------|--------|
| **Clasificación** | Riesgo probable (debilidad de defensa en profundidad) |
| **Severidad** | Media |
| **Certeza** | Alta (patrón extendido); no se demostró bypass concreto de permiso en esta pasada |
| **Ubicación** | `createSupabaseAdminClient` usado en múltiples `src/app/actions/*` (p. ej. `users.ts`, `distribution.ts`, `platform.ts`, `agencies.ts`, conductor, etc.) |
| **Evidencia** | El cliente admin omite RLS. La seguridad depende de `requireAppSession` / `sessionHasPermission` / `assertSameOrg*` **antes** de escribir. Hay buenos ejemplos (`users.ts` + `assertSameOrgWarehouseIds` + rollback `deleteAuthUserSafely`), pero un olvido futuro en una action nueva equivale a acceso cross-tenant. |
| **Impacto** | Error de programación en una sola action → lectura/escritura fuera de organización. |
| **Corrección incremental** | Preferir cliente user-scoped + RPC `SECURITY DEFINER` con checks internos para mutaciones; reservar admin a Auth Admin API / bootstrap; añadir tests eval “action X no llama admin sin permission Y”. |

---

### SEC-004 — Heurística de bypass trata URL vacía como “local”

| Campo | Valor |
|-------|--------|
| **Clasificación** | Riesgo probable |
| **Severidad** | Baja–Media |
| **Certeza** | Media |
| **Ubicación** | `src/lib/auth/dev-auth-bypass.ts` (`supabaseUrl === ""` ⇒ `localSupabase`) |
| **Evidencia** | Con `NODE_ENV !== "production"`, `DEV_AUTH_BYPASS=1` y `NEXT_PUBLIC_SUPABASE_URL` vacío, la función puede devolver `true` si la app también se considera local. |
| **Impacto** | Configuración incompleta + flag de bypass podría habilitar el camino de SEC-001 de forma inesperada (mitigado porque `isSupabaseConfigured()` suele fallar sin URL, pero la heurística es frágil). |
| **Corrección incremental** | Exigir host explícito `127.0.0.1`/`localhost`; nunca tratar string vacío como local. |

---

### SEC-005 — CSP con `'unsafe-inline'` (y `'unsafe-eval'` en no-prod)

| Campo | Valor |
|-------|--------|
| **Clasificación** | Recomendación preventiva |
| **Severidad** | Baja |
| **Certeza** | Alta |
| **Ubicación** | `next.config.ts` (`script-src` / `style-src`) |
| **Evidencia** | Production: `script-src 'self' 'unsafe-inline'`; style también `'unsafe-inline'`. Dev añade `'unsafe-eval'`. `connect-src` permite cualquier `https:` / `wss:`. |
| **Impacto** | Reduce eficacia de CSP ante XSS futuro; `connect-src` amplio facilita exfiltración si hubiera XSS. |
| **Corrección incremental** | Migrar a nonces/hashes; restringir `connect-src` a orígenes Supabase/app/Maps conocidos. |

---

### SEC-006 — URLs de tracking de proveedor sin allowlist en API pública

| Campo | Valor |
|-------|--------|
| **Clasificación** | Recomendación preventiva |
| **Severidad** | Baja |
| **Certeza** | Media |
| **Ubicación** | `src/app/api/public/tracking/route.ts` (devuelve `provider_tracking_url`); escritura en `physical-packages.ts` |
| **Evidencia** | La URL se serializa tal cual desde DB al JSON público. No hay validación de esquema `https:` ni dominio. |
| **Impacto** | Si un operador/proceso escribe una URL maliciosa, el portal público puede enlazar a phishing (no es SSRF servidor). |
| **Corrección incremental** | Validar `https:` + allowlist de carriers al guardar; en respuesta pública omitir o reescribir URLs no confiables. |

---

### SEC-007 — Spoofing de IP de rate limit si se habilita `TRUST_PROXY_HEADERS` sin proxy de confianza

| Campo | Valor |
|-------|--------|
| **Clasificación** | Riesgo probable (misconfiguración) |
| **Severidad** | Media (solo si `TRUST_PROXY_HEADERS=1` detrás de red no confiable) |
| **Certeza** | Alta en código; no activo en `.env.local` actual (`=0`) |
| **Ubicación** | `src/lib/security/request-ip.ts` |
| **Evidencia** | Con el flag en `1`, toma el primer `X-Forwarded-For` / `X-Real-Ip` sin autenticar el hop. |
| **Impacto** | Bypass o dilución de rate limits de login / tracking / validate-address. |
| **Corrección incremental** | Documentar que el flag solo va detrás de edge que sobrescribe esos headers; opcionalmente ignorar client-supplied XFF y usar solo el IP del socket/platform. |

---

### SEC-008 — Superficie CSRF clásica en login form-POST (residual baja)

| Campo | Valor |
|-------|--------|
| **Clasificación** | Recomendación preventiva |
| **Severidad** | Baja |
| **Certeza** | Media |
| **Ubicación** | `POST /api/auth/sign-in` (form y JSON) |
| **Evidencia** | Endpoint público sin token CSRF propio. Las Server Actions de Next suelen validar `Origin`; este route handler no muestra check de Origin explícito. Cookies de sesión Supabase normalmente `SameSite=Lax` mitigan CSRF de estado mutante cross-site tras login. |
| **Impacto** | Principalmente “login CSRF” (sesión del atacante en el navegador de la víctima), impacto limitado en este modelo. |
| **Corrección incremental** | Exigir `Origin`/`Referer` allowlisted en el route; preferir solo JSON same-origin. |

---

## Dependencias

| Ítem | Resultado |
|------|-----------|
| Runtime principal | `next@16.2.11`, `react@19.2.4`, `@supabase/ssr@0.6.1`, `@supabase/supabase-js@2.106.2`, `sharp@0.35.3` |
| `npm audit --omit=dev` | **0** vulnerabilidades reportadas |
| Lockfile | Presente (`package-lock.json`) |
| Notas | No se ejecutó upgrade ni `npm audit fix`. Re-auditar en CI de forma periódica. ExcelJS y demás transitive deps sin hallazgos en este snapshot. |

**Variables sensibles (presencia, sin valores):**

| Variable | Plantilla | `.env.local` |
|----------|-----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` / `ANON_KEY` | Sí (JWT demo local CLI) | Presente |
| `SUPABASE_SERVICE_ROLE_KEY` | Sí (JWT demo local CLI) | Presente |
| `SUPABASE_DB_PASSWORD` | Sí | Presente |
| `PLATFORM_OWNER_PASSWORD` | Vacío en plantilla | Presente (no volcado) |
| `GOOGLE_MAPS_API_KEY` | Comentada en plantilla | Presente |
| `DEV_AUTH_BYPASS` | No en plantilla | **Ausente** |
| `ALLOW_PUBLIC_SIGNUP` | `1` en plantilla local | `1` (aceptable en local; bloqueado en production por código + release-check) |
| `ALLOW_LOCAL_CREDENTIAL_SCRIPTS` | `0` | `0` |
| `TRUST_PROXY_HEADERS` | `0` | `0` |

**CORS:** no se encontraron cabeceras `Access-Control-Allow-Origin` permisivas en las rutas API revisadas (modelo same-origin).

**Inyección SQL:** mutaciones relevantes pasan por cliente Supabase parametrizado o RPC; no se halló concatenación SQL dinámica en TS de aplicación en el muestreo. La autoridad sigue en Postgres (recomendado mantener).

---

## Conclusión del agente

Boxario muestra una postura de seguridad **madura para una app Next + Supabase local**: gate de proxy fail-closed, permisos default-deny, aislamiento platform vs org, rate limits fail-closed, tracking público minimizado por token hash, guards SQL/RLS con catálogo comprobable, cabeceras de endurecimiento y audit de dependencias limpio.

El hallazgo más grave **confirmado** (SEC-001) está **acotado al bypass de desarrollo** y hoy el flag no está activo en `.env.local`; production lo apaga por código y el release-check lo prohíbe. Priorizar corrección del fallback de sesión y del `catch` de `requirePlatformAdmin`, luego CSPRNG para contraseñas temporales (SEC-002) y reducir dependencia de `service_role` en mutaciones de negocio (SEC-003).

**Prioridad incremental sugerida:** SEC-001 → SEC-002 → SEC-003/SEC-004 → SEC-007 (ops) → SEC-005/SEC-006/SEC-008.

---

*Fin del informe del Agente 4. Archivo canónico: `audits/04_SECURITY.md`.*
