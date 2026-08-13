# Auditoría de Pruebas y Calidad Operativa

**Agente:** 5 — Testing and Operational Quality  
**Repositorio:** Boxario  
**Fecha:** 2026-08-02  
**Modo:** Solo lectura de código fuente (sin refactor, sin cambios de dependencias, sin comandos destructivos). Se creó únicamente este informe.

## Metodología

1. Inventario de scripts de calidad en `package.json` (`quality:gate`, `quality:db`, `quality:full`, `test:*`, `check:*`, `security:release-check`).
2. Revisión del runner (`scripts/run-tests.mjs`, `scripts/lib/test-files.mjs`), Playwright (`playwright.config.mjs`, `tests/e2e/`), integración (`tests/integration/`) y scripts DB (`scripts/test-*.mjs`).
3. Conteo y clasificación de archivos `*.test.ts` / `*.eval.test.ts` / `*.test.mjs` (gate vs eval; inspección de fuente vs comportamiento).
4. Muestreo de pruebas reales (máquina de estados, stock de venta, errores de action, auth bypass) frente a pruebas de inspección de fuente (UI eval, migrations eval, actions source).
5. Mapeo de huecos: actions críticas sin tests colocalizados, rutas API sin tests, E2E fuera del gate, ausencia de CI.
6. Revisión de tooling: ESLint, TypeScript (`strict`), Knip, jscpd, arquitectura; ausencia de Prettier, husky y `.github/`.
7. Observabilidad y manejo de errores: `src/lib/observability/operation-log.ts`, `src/lib/actions/errors.ts`, uso de `console.error` en API routes.
8. Cruce con documentación existente (`docs/DECISIONES_TECNICAS_Y_COMPATIBILIDAD.md`, `docs/GUIA_DESARROLLO.md`, `docs/ARQUITECTURA.md`, `01_PROJECT_MAP.md`).

**Alcance contado (aprox.):** ~237 archivos gate en `src` + ~169 eval + ~18 tests en `scripts` + 1 E2E Playwright + 5 integración eval + ~16 scripts `test-*.mjs` de DB/seguridad. Documentación de fases reporta ~1089 tests PASS en `quality:gate`.

## Aspectos bien implementados

- **Carriles gate / eval claros:** `scripts/lib/test-files.mjs` separa `*.test.*` (gate, en `quality:gate`) de `*.eval.test.*` (eval, fuera del gate rápido). Permite feedback rápido sin perder regresiones de UI/contrato por fuente.
- **Pirámide local documentada:** `quality:gate` (typecheck + lint + architecture + duplicates + test:gate) y `quality:db` (integridad real contra Postgres local) están definidos y explicados en `docs/DECISIONES_TECNICAS_Y_COMPATIBILIDAD.md`.
- **Integridad de base de datos seria:** `scripts/test-db-integrity.mjs` ejecuta escenarios reales (cross-tenant, transiciones inválidas, stock insuficiente, multi-línea atómica) con savepoints y fixture multi-tenant — no es solo inspección de SQL.
- **Dominio puro bien cubierto:** ejemplos sólidos de tests comportamentales: `logistics-state-machine.test.ts`, `sale/box-stock.test.ts`, `actions/errors.test.ts`, `auth/dev-auth-bypass.test.ts`, `security/org-scope.test.ts`.
- **Poca dependencia de mocks pesados:** el stack usa Node test runner + `tsx`; el mocking excesivo (Jest/Vitest) es casi inexistente. `fake-indexeddb` aparece de forma acotada en cola offline del conductor.
- **Controles de higiene de código:** `check:architecture` (ciclos/capas/tamaño), `jscpd` con umbral, `knip` para código muerto, `eslint-config-next` (vitals + typescript), TypeScript `strict: true`.
- **E2E con guardas locales:** Playwright exige loopback y credenciales locales (`tests/e2e/global-setup.mjs` + `local-credential-guard`), y el smoke autenticado verifica rutas principales sin ejecutar mutaciones.
- **Errores de action con taxonomía y redacción:** `ActionError` + `publicActionErrorMessage` ocultan detalles SQL/PostgREST; hay tests dedicados de casos negativos de filtrado.
- **Scripts peligrosos con smoke propio:** `scripts/lib/critical-scripts.test.mjs` valida `node --check` y orden de borrado en scripts destructivos.
- **Release security checklist:** `security:release-check` bloquea flags de desarrollo en entorno de producción.

## Hallazgos

### [ALTA] Ausencia total de CI automatizado en el repositorio

- **Severidad:** Alta
- **Certeza:** Confirmado
- **Ubicación:** No existe `.github/`; tampoco Azure Pipelines, GitLab CI, CircleCI, Jenkinsfile, `vercel.json` ni `netlify.toml` en el checkout. Coincide con `01_PROJECT_MAP.md`.
- **Evidencia:** Inventario de filesystem; `package.json` define gates locales (`quality:gate`, `quality:full`) pero ningún workflow los invoca en push/PR.
- **Impacto técnico:** Las regresiones solo se detectan si un desarrollador ejecuta los scripts a mano. Un PR puede fusionarse sin typecheck, lint, architecture, duplicates ni `test:gate`.
- **Corrección propuesta:** Añadir un workflow mínimo de GitHub Actions (o el CI del host de despliegue) que ejecute `npm run quality:gate` en cada PR; opcionalmente un job nightly/manual con `quality:db` + Supabase local/servicio. No hace falta reescribir el proyecto: reutilizar los scripts ya existentes.

### [ALTA] E2E y `quality:full` no ejercitan flujos críticos de escritura

- **Severidad:** Alta
- **Certeza:** Confirmado
- **Ubicación:** `tests/e2e/authenticated-routes.test.mjs`; `package.json` scripts `test:e2e`, `quality:full`
- **Evidencia:** Un solo test E2E: login + GET de rutas de solo lectura (`/venta`, `/logistica`, `/inventario`, etc.) sin mutaciones. `quality:full` = `quality:gate && build && quality:db` — **no** incluye `test:e2e` ni `test:eval`.
- **Impacto técnico:** Fallos de UI interactiva (venta → pago → envío, completar tarea de conductor, publicar ruta) no se detectan en automatización de punta a punta. El smoke actual es útil pero insuficiente para operaciones de negocio.
- **Corrección propuesta:** Mantener el smoke de lectura; añadir 2–4 E2E acotados de flujos P0 (crear venta/factura, completar tarea conductor, publicar/iniciar ruta) en entorno local controlado; opcionalmente incluir `test:e2e` en un job CI separado (no necesariamente en el gate rápido).

### [ALTA] Cobertura de ejecución débil en server actions y rutas API críticas

- **Severidad:** Alta
- **Certeza:** Confirmado
- **Ubicación:** `src/app/actions/` (~69 módulos TS runtime, solo ~8 archivos de test colocalizados); `src/app/api/**/route.ts` (5 rutas, **0** tests)
- **Evidencia:** Actions sin test colocalizado incluyen `auth.ts`, `shipments-create.ts` (vía barrel), `conductor-tasks.ts`, `conductor-task-results.ts`, `pricing.ts`, `warehouse-intake.ts`, `organization.ts`, `customers.ts`, `onboarding.ts`, `logistics-route-*-actions.ts`, etc. Las rutas API `auth/sign-in`, `auth/session`, `conductor/task-results`, `validate-address`, `public/tracking` no tienen `*.test.ts` ni E2E específicos. Parte de la protección se compensa con inspección de fuente (`shipments.test.ts` lee el source) y con `test:db-integrity` a nivel SQL.
- **Impacto técnico:** Errores de orquestación TypeScript (orden de llamadas, manejo de `ActionResult`, validación previa al RPC) pueden pasar el gate aunque el SQL esté bien. Las API HTTP (rate limit, errores, cookies) quedan sin regresión automatizada.
- **Corrección propuesta:** Priorizar tests de integración ligeros o harness de action para: auth/sign-in, create sale atomic path, conductor task complete, collect payment; y tests de contrato HTTP para las 5 rutas API (status codes, rate-limit fail-closed, no fuga de detalles internos). No mockear toda la DB: reutilizar patrones de `test-db-integrity` o fixtures locales.

### [MEDIA] Predominio de pruebas eval por inspección de fuente (frágiles ante refactors)

- **Severidad:** Media
- **Certeza:** Confirmado
- **Ubicación:** `src/**/*.eval.test.ts` (~169–177 archivos); también ~60 archivos gate con patrones `readFileSync` / `assert.match(source, …)`
- **Evidencia:** Ejemplo `logistics-ui-regression.eval.test.ts`: busca strings de className, copy UI y nombres de funciones en el TSX. `inventory.test.ts` (gate) ordena índices de substrings en el source. `tests/integration/*.eval.test.mjs` leen migraciones SQL y aserciones de texto. Clasificación aproximada: ~171/177 eval con lectura de fuente; ~186 gate más comportamentales vs ~60 gate de inspección.
- **Impacto técnico:** Protegen contra “regresiones de copy/estructura” acordadas con el producto, pero fallan por renombres inocuos, reorden de helpers o cambios de className. Dan falsa sensación de cobertura de comportamiento runtime.
- **Corrección propuesta:** Conservar eval para contratos de UI explícitos (preferencias documentadas); migrar gradualmente las aserciones de lógica de negocio a tests que importen funciones puras o ejecuten RPC/DB. Evitar nuevos eval que solo comprueben classNames salvo decisión de estilo registrada.

### [MEDIA] Observabilidad operativa mínima y poco adoptada

- **Severidad:** Media
- **Certeza:** Confirmado
- **Ubicación:** `src/lib/observability/operation-log.ts`; uso de `logOperation(` casi exclusivo en `logistics-route-management-actions.ts` (+ su test)
- **Evidencia:** Helper estructurado JSON a `console.info` con redacción de claves sensibles — bien diseñado, pero con adopción casi nula. APIs usan `console.error` ad hoc (`sign-in`, `tracking`, `validate-address`, `task-results`). No hay Sentry/OpenTelemetry/pino ni agregación.
- **Impacto técnico:** En producción (o staging) es difícil correlacionar fallos de pago, rutas o auth sin logs estructurados homogéneos ni operationId de punta a punta.
- **Corrección propuesta:** Extender `logOperation` a actions P0 (venta, pago, complete task, publish route, sign-in failures) sin cambiar el transporte; más adelante cablear el mismo payload a un sink externo. No reinventar un framework de logging.

### [MEDIA] `quality:gate` no endurece warnings de ESLint ni incluye Knip

- **Severidad:** Media
- **Certeza:** Confirmado
- **Ubicación:** `package.json` — `quality:gate` vs `check:code`
- **Evidencia:** `quality:gate` ejecuta `npm run lint` (eslint sin `--max-warnings=0`). `check:code` sí usa `eslint --max-warnings=0` **y** knip. Knip queda fuera del gate documentado a propósito (`DECISIONES…`: “sin Knip”).
- **Impacto técnico:** Warnings de lint y exports muertos pueden acumularse sin romper el gate habitual de contribución.
- **Corrección propuesta:** Alinear `quality:gate` con `--max-warnings=0` (ya hay precedente en el repo). Mantener Knip en `check:code` o un job semanal; no bloquear el gate diario si el residual Knip está documentado, pero no dejar lint permisivo.

### [MEDIA] Los archivos de test quedan fuera del `typecheck` de TypeScript

- **Severidad:** Media
- **Certeza:** Confirmado
- **Ubicación:** `tsconfig.json` → `exclude`: `**/*.test.ts`, `**/*.test.tsx`, `**/*.eval.test.ts`, `**/*.eval.test.tsx`
- **Evidencia:** `npm run typecheck` = `tsc --noEmit` con esos excludes. Los tests corren vía `tsx --test` (transpilación al vuelo) sin verificación estática de tipos en CI/local gate.
- **Impacto técnico:** Errores de tipos en harness/tests (imports rotos, firmas incorrectas) pueden pasar desapercibidos hasta fallar en runtime del runner, o peores: tests mal tipados que no ejercitan la API real.
- **Corrección propuesta:** Añadir un `tsconfig.tests.json` (o quitar excludes y usar project references) y un script `typecheck:tests` opcional en eval/`check:code`.

### [BAJA] Sin formateador automático ni hooks de pre-commit

- **Severidad:** Baja
- **Certeza:** Confirmado
- **Ubicación:** No hay Prettier / `prettier.config.*` / `.prettierrc*`; no hay `.husky`
- **Evidencia:** `package.json` no declara prettier; búsqueda de configs negativa. El estilo se apoya en ESLint + convenciones humanas.
- **Impacto técnico:** Ruido en diffs y debates de formato; menor riesgo funcional.
- **Corrección propuesta:** Si se desea, adoptar Prettier o `eslint --fix` de forma incremental; o documentar explícitamente “sin Prettier” como decisión técnica. No es bloqueante.

### [BAJA] Sin métricas de cobertura de código

- **Severidad:** Baja
- **Certeza:** Confirmado
- **Ubicación:** `package.json` / tooling — no hay c8, nyc, istanbul ni scripts `coverage`
- **Evidencia:** Búsqueda en dependencias y scripts sin resultados.
- **Impacto técnico:** No se puede cuantificar cobertura por módulo; las estimaciones de esta auditoría son cualitativas.
- **Corrección propuesta:** Opcional: `node --test --experimental-test-coverage` o c8 solo sobre `src/lib/**` puro en el carril gate. Evitar obsesionarse con % global dado el peso de UI/eval.

### [INFORMATIVA] Carril eval y scripts DB quedan fuera del gate diario (por diseño)

- **Severidad:** Informativa
- **Certeza:** Confirmado
- **Ubicación:** `package.json` (`test` = gate+eval; `quality:gate` solo gate; `quality:db` separado)
- **Evidencia:** Documentado en `DECISIONES_TECNICAS_Y_COMPATIBILIDAD.md` y `GUIA_DESARROLLO.md`. Decisiones conscientes: gate rápido sin Docker; DB requiere Supabase local.
- **Impacto técnico:** Correcto para velocidad local, pero si nadie corre `test:eval` / `quality:db` antes de integrar cambios de UI/SQL, las protecciones eval/DB no actúan.
- **Corrección propuesta:** Checklist de PR ya parcialmente en `ARQUITECTURA.md` (“+ quality:db si tocó datos”); reforzar con CI condicional por paths (`supabase/migrations/**` → job DB).

### [INFORMATIVA] Casos negativos existen en dominio/seguridad, no de forma uniforme en UI/actions

- **Severidad:** Informativa
- **Certeza:** Confirmado
- **Ubicación:** Ejemplos positivos: `errors.test.ts` (redacción SQL), `dev-auth-bypass.test.ts` (bloqueo en production), `test-db-integrity.mjs` (cross-org, transición inválida, stock insuficiente), `security/qty.test.ts`
- **Evidencia:** Contraste con eval UI que mayormente aserta presencia/ausencia de strings, no caminos de error de usuario.
- **Impacto técnico:** Buena base para seguridad/dinero a nivel lib+SQL; huecos en validación negativa de formularios/actions orquestadoras.
- **Corrección propuesta:** Al añadir tests de actions, incluir al menos un caso `FORBIDDEN` / `VALIDATION` / `INSUFFICIENT_STOCK` por flujo P0.

## Cobertura estimada por área

Estimación cualitativa basada en presencia de tests comportamentales, eval de fuente, scripts DB y E2E (no en % instrumentado).

| Área | Gate / unit | Eval / source | DB scripts | E2E | Estimación global |
|------|-------------|---------------|------------|-----|-------------------|
| Máquinas de estado / reglas puras (logística, fechas, stock, pricing helpers) | Alta | Media | Baja | Nula | **Alta** |
| Seguridad org-scope, auth bypass, errores públicos | Media-Alta | Media | Alta (`test-db-integrity`) | Baja (smoke login) | **Media-Alta** |
| Inventario (movements, categorías, reservas) | Media | Alta (source) | Alta (RPC/locks) | Nula | **Media-Alta** (SQL fuerte; orquestación TS media) |
| Envíos / venta / pagos | Media (helpers) | Alta | Alta (atomic sale/payment en integrity) | Solo lectura `/venta` | **Media** |
| Conductor (tareas, offline, pagos) | Media | Alta | Alta (complete atomic) | Nula | **Media** |
| Logística rutas (publish, stops, live edit) | Media | Alta | Alta | Solo lectura `/logistica` | **Media** |
| Server actions orquestadoras | Baja (pocos tests de ejecución) | Media (source guards) | Compensa vía RPC | Nula | **Baja-Media** |
| Rutas API HTTP | Nula | Nula/baja | Nula | Nula | **Baja** |
| UI / layouts / copy | Baja comportamental | Muy alta (eval) | Nula | Smoke GET | **Media** (frágil) |
| Scripts operativos / wipe / seed | Baja-Media (`critical-scripts`) | Media | N/A | N/A | **Media** |
| Observabilidad / ops metrics | Baja (module test) | Nula | Nula | Nula | **Baja** |

## Tooling (lint/typecheck/CI)

| Herramienta | Estado | Notas |
|-------------|--------|-------|
| TypeScript `tsc --noEmit` | Presente (`typecheck`) | `strict: true`; **excluye** archivos de test |
| ESLint 9 + `eslint-config-next` | Presente (`lint`) | Vitals + TS; gate sin `--max-warnings=0` |
| Knip | Presente | En `check:code`, no en `quality:gate` |
| jscpd | Presente | Umbral 3%, ignora `*.test.ts` / `*.eval.test.ts` |
| Architecture check | Presente | Ciclos, capas, máx. 800 líneas |
| Node test runner + tsx | Presente | Lanes gate/eval vía `run-tests.mjs` |
| Playwright | Presente | 1 smoke autenticado; no en `quality:full` |
| DB integrity / phase1 scripts | Presentes | Requieren Postgres/Supabase local |
| Prettier | Ausente | — |
| Coverage reporters | Ausentes | — |
| Husky / pre-commit | Ausentes | — |
| CI remoto (GitHub Actions u otro) | **Ausente** | Gates solo locales |
| Security release env check | Presente | Manual / pre-deploy |

## Conclusión del agente

Boxario tiene un **sistema de calidad local maduro para un repo sin CI**: carriles gate/eval bien separados, ~1000+ aserciones en gate, controles de arquitectura/duplicación, y especialmente un **gate de integridad SQL** que cubre escenarios negativos de multi-tenant, pagos y atomicidad. Eso es una fortaleza real y no debe descartarse.

Los riesgos operativos principales no son “falta de tests en abstracto”, sino: **(1)** ausencia de automatización remota, **(2)** E2E limitado a smoke de lectura y excluido de `quality:full`, **(3)** poca ejecución real de server actions/API frente a mucha inspección de fuente, y **(4)** observabilidad apenas cableada. La corrección proporcional es cablear CI a los scripts existentes, añadir pocos E2E/action tests de flujos P0, y extender `logOperation` — sin reescribir el proyecto ni abandonar el enfoque eval donde documenta preferencias de UI.
)
