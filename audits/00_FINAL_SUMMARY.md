# Resumen final de auditoría — Boxario

**Fecha:** 2026-08-02  
**Fase:** solo análisis (sin cambios de código de producto)  
**Informes fuente:** `01_ARCHITECTURE.md`, `02_DUPLICATION_AND_STATE.md`, `03_LOGIC_AND_RELIABILITY.md`, `04_SECURITY.md`, `05_TESTING_AND_OPERATIONS.md`

Hallazgos duplicados entre agentes se consolidan aquí en una sola entrada.

---

## 1. Resumen ejecutivo

Boxario es un monolito Next.js 16 + Supabase/Postgres con **arquitectura de capas sólida y enforceada**, autoridad de dinero/stock/permisos en SQL/RPC, y un sistema local de calidad maduro (`quality:gate`, integridad DB, jscpd, architecture check).

El estado general es **bueno para seguir desarrollando con disciplina**, no para un rewrite. Los riesgos que más importan hoy no son “código espagueti generalizado” ni “duplicación fuera de control”, sino:

1. **Un bug de orquestación en completar tarea de conductor** que puede declarar éxito sin cerrar/cobrar (crítico).
2. **Sobrescritura de `logistics_plan` tras cobro SQL** y side-effects previos al RPC (alta confiabilidad financiera/operativa).
3. **Presión de mantenibilidad** en pantallas/actions cerca del techo de 800 líneas.
4. **Ausencia de CI remoto** y poca ejecución automatizada de actions/API/E2E de escritura.
5. **Riesgos de seguridad condicionados** (bypass de desarrollo, `Math.random` en contraseñas temporales, amplio `service_role`).

**Veredicto corto:** mantenible y seguro *si* se corrige el flujo de conductor y se mantienen los gates; no es “listo para producción a ciegas” hasta remediar H1–H3 de lógica y cablear CI + release checks.

---

## 2. Aspectos bien implementados

| Área | Qué está bien |
| --- | --- |
| Capas | UI → actions → `src/lib` → Supabase/RLS; `check:architecture` pasa (707 archivos, 0 ciclos, 0 inversiones) |
| Dinero / stock | RPC atómicos con `FOR UPDATE`, rechazo de sobrepago, guards de stock, venta atómica |
| Permisos | Default-deny en paths; UI oculta + SQL deniega; dualidad sesión/SQL intencional |
| Preview vs autoridad | Documentada en `docs/ARQUITECTURA.md` (pagos, logística, inventario, custodia) |
| Seguridad perimetral | Proxy fail-closed, rate limits, tracking por hash, CSP/HSTS, sin `dangerouslySetInnerHTML`, `npm audit` prod = 0 |
| Calidad local | Gate/eval separados, ~1000+ tests gate, `test-db-integrity` con casos negativos reales, jscpd 2,53 % &lt; 3 % |
| Particiones previas | Facades `shipments` / `logistics-routes`, carpetas `inventory/`, helpers `requireScopedActionContext` |
| Contabilidad experimental | Aislada del ledger operativo (evita dual-write accidental) |

**No tocar a la ligera:** RPCs de cobro/stock, máquina de estados + paridad SQL, matriz RLS/permisos, patrón de preview TS, `security-release-check`, integridad DB scripts.

---

## 3. Problemas confirmados

| ID | Problema | Severidad | Origen |
| --- | --- | --- | --- |
| L-H1 | `recordTaskAttempt` antes de `complete_conductor_task_atomic` provoca `replayed: true` sin completar/cobrar | Crítica | Lógica |
| L-H2 | Side-effects (evidencia, camión, factura) antes del cierre atómico | Alta | Lógica |
| L-H3 | Patch de `logistics_plan` del cliente puede pisar billing post-cobro SQL | Alta | Lógica |
| L-H4 | Errores de negocio del conductor clasificados como 503 reintentables | Media–Alta | Lógica |
| L-H5 | Path `failed` fragmentado (no usa RPC atómico) | Media | Lógica |
| L-H6 | Re-enqueue offline descarta payload nuevo en silencio | Media | Lógica |
| A-H1 | 9 archivos en zona 750–800 LOC (cuello de botella del gate) | Alta | Arquitectura |
| A-H2 | Componentes/hooks “dios” (600–700+ líneas en una función) | Alta | Arquitectura |
| A-H3 | DTOs de dominio definidos en actions e importados por UI (≥26) | Media | Arquitectura |
| T-CI | Sin CI remoto (`.github` ausente); gates solo manuales | Alta | Pruebas |
| T-E2E | E2E solo smoke GET; fuera de `quality:full` | Alta | Pruebas |
| T-ACT | Poca ejecución de actions/API en tests (~69 actions, ~8 tests; 5 APIs sin test) | Alta | Pruebas |
| SEC-002 | Contraseñas temporales con `Math.random` | Media | Seguridad |
| D-UI | Duplicación residual UI (pickers, Envíos cards/rows, bootstrap distribución, onboarding) | Baja | Duplicación |

---

## 4. Riesgos que requieren validación

| ID | Riesgo | Por qué validar |
| --- | --- | --- |
| SEC-001 | Escalada vía `DEV_AUTH_BYPASS` | Confirmada en código, pero **flag ausente** en `.env.local` y apagada en production; validar que ningún entorno expuesto la active |
| SEC-003 | Amplio `service_role` tras authz en app | Defensa en profundidad frágil; no se demostró bypass concreto en esta pasada |
| SEC-004 | URL vacía tratada como “local” en heurística bypass | Condicional a misconfiguración |
| L-H8 | Auditoría de abono oficina con preview TS | Posible drift de bitácora vs columnas reales |
| L-H9 | `stock_deducted_at` en complete sin fulfill en ese RPC | Semántica de hito vs fulfill real |
| L-H10 | Auto-eventos de custodia desde conductor | Documentado como no confirmado |
| D-H6 | Caché de onboarding a nivel de módulo | Stale cross-org posible |
| A-H7 | Densidad extrema en warehouse-intake (bytes) | Costo cognitivo; no bug runtime |

---

## 5. Evidencia de código espagueti

**No hay espagueti estructural de capas** (el grafo de dependencias está gobernado y limpio).

**Sí hay “espagueti local / god modules”** en superficies operativas:

- Funciones exportadas de 600–700+ líneas (`LogisticsFleetAdminClient`, `LogisticsTaskScheduleConfirmPanel`, `PlatformConsole`, `EnviosClient`, hooks de venta/inventario).
- Actions monolíticas aún sin split (`logistics-fleet.ts`, `distribution.ts`).
- Orquestación conductor (L-H1/H2/H5): flujo difícil de razonar porque mezcla attempt, side-effects, RPC y cola offline.

Conclusión: **espagueti puntual en UI/orquestación**, no colapso arquitectónico.

---

## 6. Duplicaciones relevantes

- **Gate jscpd: PASS (2,53 %).** No hay crisis de clones.
- Dualidades SQL+preview / permisos sesión+SQL: **intencionales**, no deuda.
- Deuda real (baja): date/time pickers, vistas Envíos cards vs rows, bootstrap distribución duplicado, `CONFIG_SECTIONS` en onboarding, boilerplate de actions.

Priorizar solo al tocar esas zonas; no un mega-refactor de duplicados.

---

## 7. Variables globales / estado compartido problemático

| Hallazgo | Evaluación |
| --- | --- |
| Sin Redux/Zustand; sin globals de dinero/stock | Bien |
| Constantes de state machine inmutables | OK |
| Caché módulo onboarding / pub-sub notificaciones / rAF venta | UI efímera; riesgo bajo–medio (onboarding) |
| Evento `"inventory-bin-placements-changed"` como literal | Informativo (typo silencioso) |

No hay variables globales peligrosas de dominio. El problema de estado más serio es la **cola offline + idempotencia mal orquestada** (L-H1/H6), no un singleton mutable de negocio.

---

## 8. Errores de lógica importantes

1. **Crítico — complete conductor:** insert de attempt con `client_operation_id` antes del RPC → replay vacío → éxito falso.  
2. **Alto — billing en plan:** cliente puede sobrescribir snapshot financiero tras cobro autoritativo.  
3. **Alto — side-effects tempranos:** camión/evidencia avanzan aunque el cierre falle.  
4. **Medio — offline/API:** 503 reintentable + re-enqueue silencioso degradan operación de campo.

La fórmula de saldo y guards SQL están bien; falla la **orquestación TS alrededor del RPC**.

---

## 9. Vulnerabilidades o riesgos de seguridad

| Clasificación | Ítems |
| --- | --- |
| Vulnerabilidad confirmada (condicional) | SEC-001 `DEV_AUTH_BYPASS` → platform owner (no-prod; flag hoy ausente) |
| Riesgo probable | SEC-002 CSPRNG; SEC-003 service_role amplio; SEC-004 heurística local; SEC-007 TRUST_PROXY_HEADERS mal usado |
| Preventivo | SEC-005 CSP unsafe-inline; SEC-006 URL tracking pública; SEC-008 CSRF residual login |
| Dependencias prod | `npm audit --omit=dev` → **0** |

Postura general: **madura**. Producción protegida por código + `security:release-check`, pero no asumir “seguro” sin corregir conductor (impacto operativo/financiero) y sin CI que ejecute release checks.

---

## 10. Estado de las pruebas

| Fortaleza | Debilidad |
| --- | --- |
| Gate local rico (~1000+ tests) | Sin CI remoto |
| DB integrity con negativos reales | E2E = smoke lectura; no en `quality:full` |
| Dominio puro bien testeado | Actions/API poco ejecutadas |
| Eval UI protege copy/estructura | Eval frágil ante refactors |
| `logOperation` bien diseñado | Casi no adoptado |

Cobertura fuerte en reglas puras + SQL; **débil en orquestación TS** — justo donde está el bug crítico L-H1.

---

## 11. Los diez problemas más importantes

1. **L-H1** Complete conductor: attempt previo anula RPC (Crítica).  
2. **L-H3** Overwrite de `logistics_plan` / billing tras cobro (Alta).  
3. **L-H2** Side-effects antes del cierre atómico (Alta).  
4. **T-CI** Sin automatización remota de `quality:gate` (Alta).  
5. **T-ACT / L-H1** Falta de tests de ejecución del path complete/cobro conductor (Alta).  
6. **A-H1/H2** Archivos/funciones dios en frontera 750–800 (Alta mantenibilidad).  
7. **L-H4/H6** Reintentos offline engañosos (Media–Alta operativa).  
8. **SEC-002** Contraseñas temporales no CSPRNG (Media).  
9. **SEC-001** Endurecer bypass de desarrollo (Alta condicional).  
10. **T-E2E** Ampliar E2E a 2–4 flujos P0 de escritura (Alta calidad operativa).

---

## 12–15. Plan de acción priorizado

### Urgente

| Acción | Esfuerzo | Riesgo del cambio | Verificación |
| --- | --- | --- | --- |
| Corregir L-H1: no insertar attempt antes del RPC; manejar `replayed`; fallar si tarea no quedó `completed` | 0.5–1.5 d | Medio (flujo conductor/offline) | Test integración: submit online → tarea completed + pago si aplica; reintento offline no deja tarea abierta; `npm run test:gate` + script DB related |
| Corregir L-H3: no reemplazar `logistics_plan` completo desde cliente tras cobro; excluir billing del patch | 0.5–1 d | Medio (RPC + TS) | Tras cobro, columnas `shipments` y `logistics_plan.billing` coinciden; integrity/payment tests |
| Reordenar L-H2 / no marcar offline `synced` si RPC no completa | 1–2 d | Medio–Alto | Fallo simulado de RPC no deja camión/evidencia como “éxito”; cola queda retryable con mensaje útil |
| Añadir test de regresión del bug L-H1 (action o DB harness) | 0.5 d | Bajo | Test rojo→verde en CI/local |

### Próximo

| Acción | Esfuerzo | Riesgo del cambio | Verificación |
| --- | --- | --- | --- |
| CI GitHub Actions: `npm run quality:gate` en PR (+ `security:release-check` en deploy) | 0.5–1 d | Bajo | PR demo falla si typecheck/lint/tests fallan |
| Mapear errores conductor a 4xx no reintentables (L-H4); arreglar re-enqueue (L-H6) | 1–2 d | Medio | Offline no reintenta “saldo insuficiente”; UI muestra causa |
| Unificar path `failed` en RPC atómico (L-H5) | 0.5–1 d | Medio | Fallo de tarea: attempt+tarea+stop coherentes en una transacción |
| SEC-002: CSPRNG en contraseñas temporales | 0.25–0.5 d | Bajo | Tests de contrato de longitud/alfabeto; code review sin `Math.random` |
| SEC-001: no fabricar owner/admin en bypass; no sustituir JWT ajeno | 0.5 d | Bajo (solo no-prod) | Tests `dev-auth-bypass` + casos sesión sin perfil |
| Split preventivo de 2–3 archivos frontera (agenda confirm, logistics-fleet, distribution) | 2–4 d | Bajo–Medio | `check:architecture` PASS; smoke UI de esas pantallas |

### Posterior

| Acción | Esfuerzo | Riesgo del cambio | Verificación |
| --- | --- | --- | --- |
| Mover DTOs (`LogisticsRouteCatalog`, etc.) a `src/lib` | 1–2 d | Bajo | Imports UI desde lib; typecheck |
| 2–4 E2E P0 (venta, complete tarea, publish/start ruta) + job CI opcional | 3–5 d | Medio (flaky) | Playwright verde en local; no meter en gate rápido al inicio |
| Tests HTTP de 5 rutas API | 1–2 d | Bajo | Status codes, rate-limit, no fuga SQL |
| Extender `logOperation` a P0 | 1 d | Bajo | Logs JSON en complete/pago/sign-in failure |
| Deduplicar pickers / Envíos presenter / onboarding sections | 1–2 d | Bajo | jscpd no sube; UX igual |
| Housekeeping raíces `lib`/`components`; Prettier opcional; typecheck tests | incremental | Bajo | Docs + gates |

---

## Respuestas directas

### ¿El código es mantenible actualmente?

**Sí, con matices.** Las capas y la documentación lo hacen predecible; la fricción está en módulos frontera (750–800 líneas) y god components. Se puede mantener y extender **si** se parte al tocar y se respetan los gates.

### ¿Existe código espagueti?

**Puntual, no sistémico.** No hay maraña de capas; sí hay orquestaciones densas (conductor, venta, flota) y funciones monolíticas.

### ¿Hay duplicaciones importantes?

**No a nivel de crisis.** jscpd bajo umbral; dualidades documentadas son diseño. Duplicación UI/actions es deuda menor.

### ¿Existen varias fuentes de verdad?

**Por diseño, en preview vs autoridad SQL** (correcto). Riesgo real: **billing en `logistics_plan` vs columnas de cobro** (L-H3) y bitácora TS vs SQL (L-H8). Plantilla de roles TS vs DB es plantilla, no autoridad.

### ¿Hay variables globales innecesarias o peligrosas?

**No de dominio.** Solo cachés/pub-sub de UI de bajo riesgo. Lo peligroso es estado de cola offline mal sincronizado, no un global mutable de negocio.

### ¿La lógica presenta riesgos de errores?

**Sí — uno crítico confirmado** en complete/cobro conductor (L-H1), más L-H2/H3. El núcleo SQL financiero es sólido; la orquestación TS no.

### ¿El código es seguro para producción?

**Condicionalmente.** Controles perimetrales y RLS son fuertes; `npm audit` limpio; bypass off en prod. **No declarar “seguro para producción”** hasta remediar L-H1–H3 (integridad operativa/financiera) y asegurar CI + `security:release-check` en deploy. SEC-001 no aplica en production si el entorno está bien configurado.

### ¿Es seguro seguir agregando funcionalidades?

**Sí, con reglas:** no tocar dinero/stock sin RPC; partir archivos frontera antes de hincharlos; añadir test de ejecución en paths P0; no activar `DEV_AUTH_BYPASS` fuera de localhost; correr `quality:gate` (+ `quality:db` si toca datos).

### ¿Qué cinco cambios deben realizarse primero?

1. Corregir **L-H1** (attempt/RPC conductor).  
2. Corregir **L-H3** (no pisar billing del plan).  
3. Alinear **L-H2** + no marcar sync si el RPC falla.  
4. Añadir **test de regresión** + **CI con `quality:gate`**.  
5. Endurecer **mapeo de errores offline (L-H4/H6)** y **SEC-002** (CSPRNG).

### ¿Qué partes no deberían modificarse porque ya están bien?

- RPCs de cobro/stock/venta atómica y guards SQL (`FOR UPDATE`, rechazo sobrepago).  
- `logistics-state-machine` + paridad documentada con SQL.  
- Modelo de permisos (sesión preview + SQL enforcement).  
- Proxy/auth gates, rate limits, tracking público por hash.  
- Gates `check:architecture`, `check:duplicates`, `test-db-integrity`, `security:release-check`.  
- Aislamiento de contabilidad experimental respecto a `shipment_payments`.  
- Particiones ya hechas (`inventory/`, `logistics-routes*`, barrel `shipments`).

---

## Inventario de entregables

| Archivo | Estado |
| --- | --- |
| `audits/01_ARCHITECTURE.md` | Completo |
| `audits/02_DUPLICATION_AND_STATE.md` | Completo |
| `audits/03_LOGIC_AND_RELIABILITY.md` | Completo |
| `audits/04_SECURITY.md` | Completo |
| `audits/05_TESTING_AND_OPERATIONS.md` | Completo |
| `audits/00_FINAL_SUMMARY.md` | Este documento |

**Siguiente fase (cuando se autorice):** implementar solo el plan Urgente, en PRs pequeños, sin rewrite.
