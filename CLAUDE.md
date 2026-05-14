# PORTAL — RushData SaaS

> Plataforma SaaS B2B para proveedores de cadenas comerciales. Mario (RushData) opera ingesta de datos desde portales de retailers; clientes ven dashboards con KPIs, sugeridos de pedido, alertas de quiebre y fill rate de OC.

**Cuando inicies sesión en este proyecto, leer este archivo PRIMERO y luego el documento de `docs/` relevante al tema que se vaya a tocar.** Para snapshots históricos (fases completadas, decisiones pasadas, row counts), ver `docs/HISTORY.md` — no leer salvo necesidad.

---

## MENÚ DE ENTRADA (al iniciar sesión)

Cuando Mario abra una sesión nueva en este proyecto, después de leer este CLAUDE.md, **mostrarle este menú**:

```
RushData PORTAL — ¿En qué seguimos hoy?

  A. Continuar con MVP (donde quedamos en el roadmap)
  B. Onboardear cliente nuevo
  C. Agregar cadena comercial nueva (HEB, MERCO, Walmart, etc.)
  D. Revisar / cambiar algo del diseño (schema, frontend, formulas)
  E. Polish / mejorar la demo antes de enseñarla
  F. Otro / no listado

Dime la letra o describe qué quieres hacer.
```

- **A** → Leer `docs/ROADMAP.md`, identificar próximo paso pendiente, ejecutar
- **B** → Seguir el **Flujo de onboarding cliente nuevo** (sección más abajo)
- **C** → Seguir el **Flujo de agregar cadena comercial nueva** (sección más abajo)
- **D** → Pedir qué doc revisar: `SCHEMA.md`, `FRONTEND.md`, `FORMULAS.md`, `KILLER_FEATURES.md`, `INGEST_PATTERN.md`, `PLAN.md`, `ROADMAP.md`. Si es sobre alguna vista específica (Home, /sugeridos, /forecast, /tiendas, /productos, /oc), leer también la sección "Sesión 2026-05-13/14" de `HISTORY.md` para entender por qué quedó como está.
- **E** → Preguntar qué área de la demo polir: visual de cards/tablas, copy de los textos, manejo de inventario negativo, conectar dominio `app.rushdata.com.mx`, etc.
- **F** → Preguntar qué necesita

Si Mario dice directamente "vamos con [tema]" sin pasar por el menú, saltar directo.

---

## Identidad del producto

- **Nombre:** RushData
- **Subdominio:** `app.rushdata.com.mx` (pendiente DNS) — vivo en `app-rushdata.vercel.app`
- **Codename interno:** PORTAL
- **Owner:** Mario Peña (mario@rushdata.com.mx)
- **Tagline:** "Si Power BI te dice qué pasó, RushData te dice qué hacer."

---

## Stack tecnológico (decidido)

| Capa | Tecnología |
|---|---|
| BD + Auth + Storage | **Supabase** (Postgres, RLS multi-tenant) |
| Backend lógico | **Postgres functions + Edge Functions** |
| Frontend | **Next.js 16** (App Router) + **Tailwind v4** + **React 19** |
| Charts | SVG nativos (Sparkline, BarChart). Recharts/Tremor descartados (ver `docs/HISTORY.md`) |
| Tipografía | **Plus Jakarta Sans** + **JetBrains Mono** (números) |
| Hosting | **Vercel** (root dir `web/`, Node 22.x, Framework=Next.js) |
| Repo | **GitHub** `rushdatamx/app-rushdata` (privado) |
| Ingesta | **Python local + supabase-py** (carga manual, NO scraping) |
| Estilo visual | Handle / Savio data-dense — ver `docs/FRONTEND.md` |

### Decisiones que NO se cuestionan sin revisar primero

- **Multi-tenant en UNA SOLA BD Supabase** — NO un proyecto por cliente. Aislamiento por RLS + `org_id`.
- **NO migrar a Railway** todavía — Supabase cubre BD+Auth+Storage+Cron.
- **NO usar n8n** en MVP — pipeline manual está bien hasta 5+ clientes.
- **NO scrapear portales automáticamente** — Mario baja archivos manual.
- **NO permitir uploads de clientes** en MVP — solo Mario carga.
- **Schema canónico SIEMPRE** — toda tabla transaccional lleva `org_id` y `chain_id`. Ver `docs/SCHEMA.md`.

---

## Arquitectura multi-tenant

UNA sola BD Supabase, todos los clientes comparten infraestructura. Aislamiento por **Row Level Security (RLS)** + columna `org_id` en toda tabla transaccional.

**Aislamiento garantizado por:**
1. RLS habilitado en cada tabla con `org_id`
2. Política uniforme: `using (org_id = auth_org_id())`
3. Helper `auth_org_id()` lee del JWT (`app_metadata.org_id`)
4. Frontend usa cliente Supabase con sesión (NUNCA `service_role` en cliente)
5. Ingesta usa `service_role` (bypassa RLS) pero pasa `org_id` explícitamente

**Excepción futura:** cliente enterprise ($5k+/mes) puede tener proyecto Supabase dedicado corriendo el mismo `sql/00_schema.sql`. No es preocupación del MVP.

---

## Flujo: ONBOARDING CLIENTE NUEVO (opción B)

### Paso 0 — Preguntas a Mario

```
¿Datos del cliente nuevo?
  1. Nombre legal completo
  2. Slug (lowercase, sin espacios)
  3. Plan ('pilot' | 'starter' | 'pro')
  4. Email del usuario admin
  5. ¿Qué cadenas habilitar?
  6. ¿Tiene archivos históricos o empieza de cero?
```

### Paso 1 — Crear org en BD

```sql
insert into organizations (slug, name, plan)
values ('sabritas', 'Sabritas S.A. de C.V.', 'starter');

insert into org_chain_access (org_id, chain_id, enabled)
select (select id from organizations where slug = 'sabritas'), id, true
from chains where slug in ('heb', 'merco');
```

### Paso 2 — Crear usuario admin

Usar helper `admin_create_user()`. Una sola línea hace todo: crea `auth.users` con campos string correctos, `auth.identities`, `public.users`, y el trigger sincroniza `org_id` + `role` al JWT.

```sql
select public.admin_create_user(
  'admin@sabritas.com.mx',  -- email
  'sabritas',               -- org_slug
  'admin'                   -- role: admin|editor|viewer
);
```

Email queda confirmado para que el primer magic link funcione directo. Mario solo comparte la URL.

> ⚠️ **Nunca insertar directo en `auth.users` con SQL libre.** GoTrue espera `confirmation_token`, `recovery_token`, etc. como **strings vacíos `''`**, no NULL. Si quedan NULL, `/otp` falla con "500: Database error finding user". `admin_create_user()` ya lo resuelve.

### Paso 3 — Cargar catálogos

```bash
python -m ingest.heb.load_stores --org sabritas tiendas-sabritas.xlsx
python -m ingest.heb.load_products --org sabritas productos-sabritas.xlsx
```

### Paso 4 — Cargar histórico (si lo tiene)

```bash
for archivo in inventarios/*.xlsx; do
  python -m ingest.heb.load_inventory --org sabritas $archivo
done
python -m ingest.heb.load_sales --org sabritas ventas-sabritas.xls
for archivo in OCs/*.xlsx; do
  python -m ingest.heb.load_po --org sabritas $archivo
done
```

### Paso 5 — Primer batch de sugeridos

```sql
select fn_run_engine((select id from organizations where slug = 'sabritas'));
```

### Paso 6 — Validar y enviar acceso

1. SQL: `select count(*) from suggested_orders where org_id = (...);`
2. Probar login con email del cliente
3. Onboarding call de 30 min

### Paso 7 — Documentar en `docs/CLIENTS.md`

Fecha onboarding, cadenas activas, plan, status (`pilot` / `active` / `paused` / `churned`).

---

## Flujo: AGREGAR CADENA COMERCIAL NUEVA (opción C)

### Paso 0 — Preguntas

```
1. Nombre comercial
2. Slug
3. Calendario fiscal (HEB) o gregoriano (MERCO, ALSUPER)?
4. ¿Archivos de ejemplo? (inventario, ventas, OCs, tiendas)
```

### Paso 1 — Insertar chain

```sql
insert into chains (slug, name, country, calendar_type)
values ('walmart', 'Walmart México', 'MX', 'gregorian');
```

Si es fiscal, poblar `chain_calendars`.

### Paso 2 — Analizar archivos

Leer `docs/INGEST_PATTERN.md`. Yo analizo con Python y respondo:
- Estructura real de columnas
- Formato de OC (wide / long / bulk)
- Particularidades (UPCs raros, headers dinámicos, PDFs)
- Riesgos identificados

### Paso 3 — Crear adapter `ingest/walmart/`

Scripts: `config.py`, `load_stores.py`, `load_inventory.py`, `load_sales.py`, `load_po.py`, `README.md`. Cada uno devuelve `Canonical*` rows (`ingest/shared/canonical.py`).

### Paso 4 — Validar con datos reales

```bash
python -m ingest.walmart.load_inventory --org delikos --dry-run archivo.xlsx
```

Comparar conteos contra Excel original.

### Paso 5 — Reglas específicas

Cover target days, lead time, packaging, exclusión CEDIS si aplica. Documentar en `ingest/walmart/README.md`.

### Paso 6 — Habilitar para clientes

```sql
insert into org_chain_access (org_id, chain_id, enabled)
values (
  (select id from organizations where slug = 'delikos'),
  (select id from chains where slug = 'walmart'),
  true
);
```

### Paso 7 — Actualizar tabla "Cadenas soportadas" y `INGEST_PATTERN.md`

**Tiempo realista:** 2-3 semanas por cadena nueva.

---

## Estructura del repo (top-level)

```
PORTAL/
├── CLAUDE.md             ← este archivo
├── .env.local            ← 🔒 gitignored
├── docs/                 ← PLAN, SCHEMA, INGEST_PATTERN, FORMULAS, KILLER_FEATURES, FRONTEND, ROADMAP, HISTORY
├── sql/                  ← 00_schema, 01_seeds, 02_views, 03_functions (todos aplicados)
├── data/
│   ├── mock/             ← 📄 CSVs públicos versionados
│   └── source/           ← 🔒 gitignored — datos reales clientes
├── ingest/               ← Python adapters por cadena
└── web/                  ← Next.js 16, Vercel
```

Detalle de `web/` y rutas activas → `docs/HISTORY.md`.

---

## Cómo trabajamos en cada sesión

1. **Leer este CLAUDE.md** para recordar contexto.
2. **Mostrar el menú de entrada** si Mario no especifica qué quiere hacer.
3. **Leer el `docs/X.md`** relevante al tema (no leer todos — sería ruido).
4. **Si el cambio afecta varios docs**, avisar antes de tocar.
5. **Actualizar el doc correspondiente** cuando se tome una decisión nueva.
6. **Nunca tocar `sql/00_schema.sql` sin avisar** — usar archivos numerados nuevos: `sql/04_xxx.sql`.

### Reglas de oro

- **Schema canónico es sagrado.** Antes de agregar columna específica de una cadena, preguntar si se puede modelar genéricamente.
- **Multi-tenant SIEMPRE.** Toda query respeta `org_id`. RLS en Postgres + cliente Supabase con sesión en frontend (nunca `service_role` en cliente).
- **Numeric, no Float.** Para dinero y unidades, `numeric(14,2)`.
- **Fechas con timezone.** `timestamptz`, nunca `timestamp`. México UTC-6.
- **UPCs como `text`, no `bigint`.** Existen UPCs con ceros líderes. Y abrir CSVs en Excel/Numbers los rompe a notación científica — usar VS Code/TextEdit.
- **Una BD, muchos clientes.** No proyectos Supabase aparte (salvo enterprise contractual).

---

## Cadenas soportadas

| Cadena | Slug | Estado | Notas |
|---|---|---|---|
| HEB / MITIENDA | `heb` | **MVP activo** | Calendario fiscal (13 periodos/año). OC formato wide. |
| MERCO | `merco` | Pendiente (post-MVP) | OC bulk a CEDIS, 32 GRANDES + 8 CHICAS, excluir Super Roma. Gregoriano. |
| ALSUPER | `alsuper` | Pendiente | Solo inventario, sin sell-out, 87 tiendas + 2 CEDIS. |
| Walmart, Soriana, La Comer, Chedraui | — | Roadmap | TBD |

**MVP solo HEB.** Schema soporta las demás sin cambios estructurales.

---

## Estrategia DEMO-FIRST

En lugar de construir el MVP directo con datos reales de Delikos, primero hicimos una **demo vendible** con mock data que se enseña a clientes prospecto. Cuando entren clientes reales, replicamos el flujo con sus datos.

**Por qué:** permite vender ANTES de tener clientes operando + no expone datos sensibles + datos curados muestran el producto en su mejor luz.

### Mock data flow

CSVs en `PORTAL/data/mock/` versionados. Carga capa por capa (productos → stores → packaging → inventory → sales → POs → PO lines). Ver `data/mock/README.md` para convenciones.

---

## Clientes (orgs activas)

| Cliente | Slug | Plan | Cadenas | Status | Onboarded |
|---|---|---|---|---|---|
| Sazonadores Vence Real | `sazonadores-vence-real` | demo | HEB | demo lista | 2026-05-12 |
| Delikos | `delikos` | pilot | HEB | post-demo | TBD |

Cuando entren más, mantener tabla aquí + detalle en `docs/CLIENTS.md`.

---

## Personas

- **Mario Peña** — Owner (KAM Delikos, fundador RushData)
- **Patricio Medrano** — Responsable abasto MERCO (no aplica MVP)
- **Jesús Núñez** — Jefe de Mario en Delikos (Delikos = primer cliente pilot)

---

## Glosario

- **DDI / DOS** — Días De Inventario / Days Of Supply. `inventario_actual / venta_promedio_diaria`
- **OC** — Orden de Compra (PO)
- **PDQ** — Pre-pack display HEB; presentación que mezcla 3 sabores
- **Sell-in** — Lo que la empresa factura al retailer
- **Sell-out** — Lo que el retailer vende al consumidor final
- **Fill rate** — `unidades_recibidas / unidades_pedidas` de una OC
- **Quiebre / stockout** — DDI=0 en una tienda para un producto
- **CEDIS** — Centro de distribución del retailer
- **OSA** — On-Shelf Availability. Producto realmente disponible en anaquel
- **Phantom stockout** — Inventario sistémico > 0 pero ventas = 0 por días
- **Lead time** — Días entre OC y recepción en tienda
- **Adapter** — Capa Python que traduce formato de cadena a schema canónico

---

## Estado actual (resumen)

- **Fases 0-5 completas** (BD + motor + frontend + auth + deploy). Detalle en `docs/HISTORY.md`.
- **Demo viva** en https://app-rushdata.vercel.app con magic link.
- **Org demo:** Sazonadores Vence Real (HEB, ~106k filas mock).
- **13 rutas activas:** `/`, `/sugeridos`, `/forecast`, `/flow`, `/oc`, `/tiendas`, `/tiendas/[id]`, `/productos`, `/productos/[id]`, `/cobertura`, `/reportes`, `/reporte` (no en sidebar).
- **Sesión 2026-05-13/14 (commit `24f0b10`):** densificación KAM-first de las 5 vistas + nueva `/forecast`. Chips con contador, KPIs accionables, Lost Sale Ledger YTD, forecast con MAPE backtest.
- **Sesión 2026-05-14 paridad MatchData (commit `b9b7f70`):** 8 features Tier 1+2+3 completadas. Selector de período dual (calendario + fiscal HEB), vista `/cobertura` (matriz tienda×SKU global), Export CSV global en 6 vistas, histórico multi-año con refactor SQL `fn_*_kpis(p_org_id, p_start, p_end)`, reporte PDF `/reporte` print-friendly, vista `/flow` sell-in vs sell-out con insight automático, columna ASP en `/productos` con detección de promos agresivas, pivot builder `/reportes` ad-hoc. **Detalle completo + arquitectura técnica Supabase ↔ Frontend en `docs/HISTORY.md`**.
- **Sesión 2026-05-14 (tarde) — Home rediseño + bugs cap 1000 + sub-tabs pivote:**
  - **Home** reescrita: ahora muestra venta sell-out 12m YoY (bar chart + tabla pivote) + Top 10 productos/tiendas por revenue. Lo operativo del día se quitó (vive en `/sugeridos`, `/oc`, etc.). Nuevos: `home-business/` components + `sql/07_sales_business_view.sql` (`fn_sales_monthly_yoy`, `fn_sales_top_products`, `fn_sales_top_stores`).
  - **Bug crítico**: Supabase corta `.select()` a 1000 filas sin `.limit()`. La tabla `sales` tiene 83k filas, así que `/forecast` y `/flow` mostraban $0/casi-todo-en-cero. Fix: agregar en Postgres con `fn_sales_daily_series` y `fn_sales_product_daily` (`sql/08_forecast_functions.sql`). Refactor en `forecast.ts` y `flow.ts`.
  - **Bug `"use client"` faltante** en 3 tablas que pasaban funciones (`accessor`) al `CsvExportButton` (Client): `OCRecentTable`, `TiendasTable`, `ProductosTable`.
  - **Mock sell-in ajustado**: sell-through acumulado 17m pasó de 53% a 83.7% (target 85%). Diciembre 2025 queda en 60% (pico navideño = drama KAM reconocible). Aplicado directo en BD (no versionado como SQL — es ajuste de datos demo).
  - **Sub-tabs en `/tiendas` y `/productos`**: nueva pestaña "Detalle por tienda/producto" con tabla pivote + filtros (single-select tienda/producto/región/categoría) + dropdown "Agrupar por" + comparativo YoY + CSV export. URL: `?tab=detalle`. Nuevos: `sql/09_sales_pivot_functions.sql` (`fn_sales_pivot_yoy`), `pivot-detail.ts`, `shared/SubTabs.tsx`, `shared/DetalleTable.tsx`, `*Detalle.tsx`, `*DetalleFilters.tsx`. Presets `6m` y `12m` agregados al `PeriodSelector`.

### Pendientes principales

- [ ] Conectar dominio `app.rushdata.com.mx`
- [ ] Polish visual antes de enseñar a prospectos
- [ ] Onboarding Delikos con datos reales (post-demo)
- [ ] Adapter MERCO post-Delikos
- [ ] pg_cron para correr `fn_run_engine` automático
- [ ] Versionar migraciones Fase 5 (auth) en `sql/06_auth.sql`
- [ ] Histórico de stockouts (tabla nueva) para que F4 también afecte "stockouts en período X"
- [ ] Cruce 2D (row×col) en `/reportes`
- [ ] `/forecast` con selector dual completo (requiere refactor del modelo comparativo)
- [ ] **Borrar componentes y queries viejos de Home** (`components/home/*`, `queries/home.ts`, `home-stats.ts`, `home-timeseries.ts`, `lost-sale-ledger.ts`) cuando `/reporte` y `/productos` dejen de usarlos
- [ ] **Auditar queries que leen `sales` cruda** — riesgo de cap 1000 latente en `/cobertura`, `/sugeridos`, `/reporte`, `/reportes`. Migrar a RPC agregada

---

**Próximo paso al volver:**
- (a) Iterar mejoras sobre las vistas (Mario abrirá sesión nueva con eso) — ver "Pendientes / mejoras detectadas" en `docs/HISTORY.md` sesiones 2026-05-13/14 y 2026-05-14
- (b) Conectar dominio `app.rushdata.com.mx`
- (c) Validar `/forecast` y `/flow` con datos reales de Delikos cuando entre
- (d) Killer features pendientes: phantom stockouts, OC sub-óptima detector, lead time real por tienda
- (e) Enseñar a prospecto / onboardear Delikos
- (f) Adapter MERCO
