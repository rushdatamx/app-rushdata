# PORTAL — RushData SaaS

> Plataforma SaaS B2B para proveedores de cadenas comerciales. Mario (RushData) opera ingesta de datos desde portales de retailers; clientes ven dashboards con KPIs, sugeridos de pedido, alertas de quiebre y fill rate de OC.

**Cuando inicies sesión en este proyecto, leer este archivo PRIMERO y luego el documento de `docs/` relevante al tema que se vaya a tocar.**

---

## MENÚ DE ENTRADA (al iniciar sesión)

Cuando Mario abra una sesión nueva en este proyecto, después de leer este CLAUDE.md, **mostrarle este menú**:

```
RushData PORTAL — ¿En qué seguimos hoy?

  A. Continuar con MVP (donde quedamos en el roadmap)
  B. Onboardear cliente nuevo
  C. Agregar cadena comercial nueva (HEB, MERCO, Walmart, etc.)
  D. Revisar / cambiar algo del diseño (schema, frontend, formulas)
  E. Otro / no listado

Dime la letra o describe qué quieres hacer.
```

- **A** → Leer `docs/ROADMAP.md`, identificar próximo paso pendiente, ejecutar
- **B** → Seguir el **Flujo de onboarding cliente nuevo** (sección más abajo en este archivo)
- **C** → Seguir el **Flujo de agregar cadena comercial nueva** (sección más abajo)
- **D** → Pedir qué doc revisar: `SCHEMA.md`, `FRONTEND.md`, `FORMULAS.md`, `KILLER_FEATURES.md`, `INGEST_PATTERN.md`, `PLAN.md`, `ROADMAP.md`
- **E** → Preguntar qué necesita

Si Mario dice directamente "vamos con [tema]" sin pasar por el menú, saltar directo.

---

## Identidad del producto

- **Nombre:** RushData (usar marca del usuario)
- **Subdominio:** `app.rushdata.com.mx`
- **Codename interno:** PORTAL
- **Owner:** Mario Peña (mario@rushdata.com.mx)
- **Tagline:** "Si Power BI te dice qué pasó, RushData te dice qué hacer."

---

## Stack tecnológico (decidido)

| Capa | Tecnología | Por qué |
|---|---|---|
| BD + Auth + Storage | **Supabase** (Postgres) | RLS multi-tenant nativo, auth incluido, storage para xls raw |
| Backend lógico | **Postgres functions + Edge Functions** | Sin servidor extra; mover a Python en Railway si motor crece |
| Frontend | **Next.js 15 (App Router)** + **Tailwind** + **shadcn/ui** | Vercel deploy, Server Components |
| Charts | **Tremor** (primario) + **Recharts** (fallback) | Data-dense, estilo Handle/Savio |
| Tipografía | **Plus Jakarta Sans** + **JetBrains Mono** (para números) | Notion vibe + data-dense |
| Hosting frontend | **Vercel** | Default Next.js |
| Repo | **GitHub** (org: `rushdatamx`) | Privado por ahora |
| Ingesta | **Python local + supabase-py** | Mario corre scripts; portales NO se scrapean automático (captchas) |
| Email transaccional | **Resend** (Fase 5, no MVP) | Magic links de Supabase Auth bastan en MVP |
| Estilo visual | Handle / Savio data-dense | Ver `docs/FRONTEND.md` |

### Decisiones que NO se cuestionan sin revisar primero

- **Multi-tenant en UNA SOLA BD Supabase** — NO un proyecto Supabase por cliente. Ver "Arquitectura multi-tenant" abajo. Cambiar esto requiere conversación explícita.
- **NO migrar a Railway todavía** — Supabase cubre BD+Auth+Storage+Cron. Railway entra solo si motor de sugeridos necesita pandas pesado (v2+).
- **NO usar n8n en MVP** — Pipeline manual está bien. n8n entra cuando haya 5+ clientes y orquestación compleja.
- **NO scrapear portales automáticamente** — Mario baja archivos manual (captcha, 2FA, HTML cambia). El SaaS es "servicio gestionado", no scraper.
- **NO permitir uploads de clientes en MVP** — Solo Mario carga. Eso evita 80% de la UI compleja.
- **Schema canónico SIEMPRE** — Toda tabla transaccional lleva `org_id` y `chain_id`. Nunca tablas tipo `inventario_heb`, `inventario_merco`. Ver `docs/SCHEMA.md`.
- **Resend NO en Fase 0** — Movido a Fase 5. Magic links via Supabase Auth nativo en MVP.

---

## Arquitectura multi-tenant (cómo se manejan clientes)

**Decisión:** UNA sola BD Supabase, todos los clientes comparten infraestructura. Aislamiento por **Row Level Security (RLS)** + columna `org_id` en toda tabla transaccional.

### Cómo funciona

```
                  Supabase Project: rushdata-portal
                  ┌──────────────────────────────────┐
                  │ Tabla: organizations             │
                  │   id   slug      name           │
                  │   1    delikos   Delikos S.A.   │
                  │   2    sabritas  Sabritas       │
                  │   3    barcel    Barcel         │
                  └──────────────────────────────────┘
                  
                  ┌──────────────────────────────────┐
                  │ Tabla: inventory_snapshots       │
                  │   org_id  store  product  units │
                  │   1       ...    ...      ...   │
                  │   1       ...    ...      ...   │
                  │   2       ...    ...      ...   │  ← Sabritas
                  │   3       ...    ...      ...   │  ← Barcel
                  └──────────────────────────────────┘

  RLS automáticamente filtra:
    SELECT ... FROM inventory_snapshots
    → Postgres agrega: WHERE org_id = current_user.org_id
```

### Por qué no un proyecto por cliente

| Aspecto | Una BD | Un proyecto por cliente |
|---|---|---|
| Onboarding | 5 min | 2-3 horas |
| Costo a 10 clientes | $25/mes | $250/mes |
| Mantener schema | 1 lugar | 10 lugares |
| Bug fix global | 1 deploy | 10 deploys |
| Benchmarking cross-tenant | ✅ Posible | ❌ Imposible |
| Es como Linear, Notion, Vercel | ✅ | |

**Excepción** (futuro lejano): Cliente enterprise que pague $5k+/mes y exija BD dedicada. En ese caso se crea otro proyecto Supabase corriendo el MISMO `sql/00_schema.sql` (sin rework). No es preocupación del MVP.

### Aislamiento garantizado por

1. **RLS** habilitado en cada tabla con `org_id`
2. **Política** uniforme: `using (org_id = auth_org_id())`
3. **Helper function** `auth_org_id()` que lee del JWT del usuario
4. **Frontend** usa cliente Supabase con sesión (NUNCA `service_role` en cliente)
5. **Ingesta** usa `service_role` (bypassa RLS) — pero pasa `org_id` explícitamente en cada insert

---

## Flujo: ONBOARDING CLIENTE NUEVO (opción B del menú)

Cuando Mario diga "B" o "quiero meter cliente nuevo":

### Paso 0 — Preguntas a Mario

```
¿Datos del cliente nuevo?

  1. Nombre legal completo (ej: "Sabritas S.A. de C.V.")
  2. Slug (corto, lowercase, sin espacios — ej: "sabritas")
  3. Plan ('pilot' | 'starter' | 'pro')
  4. Email del usuario admin del cliente
  5. ¿Qué cadenas comerciales le vamos a habilitar?
       (HEB, MERCO, ALSUPER, Walmart, ...)
  6. ¿Tiene archivos históricos que cargar o empieza de cero?
```

### Paso 1 — Crear organización en BD

```sql
-- Mario corre esto via SQL Editor Supabase
insert into organizations (slug, name, plan)
values ('sabritas', 'Sabritas S.A. de C.V.', 'starter');

-- Habilitar cadenas
insert into org_chain_access (org_id, chain_id, enabled)
select 
  (select id from organizations where slug = 'sabritas'),
  id,
  true
from chains where slug in ('heb', 'merco');  -- cadenas que se le habilitan
```

### Paso 2 — Crear usuario admin en Supabase Auth

```
1. Supabase Dashboard → Authentication → Users → Add user
   - Email: admin@sabritas.com.mx
   - Password: dejar vacío (magic link)
2. SQL Editor:
   insert into users (id, org_id, email, role)
   values (
     (select id from auth.users where email = 'admin@sabritas.com.mx'),
     (select id from organizations where slug = 'sabritas'),
     'admin@sabritas.com.mx',
     'admin'
   );
```

### Paso 3 — Cargar catálogos del cliente

Pedirle a Mario el catálogo de productos y tiendas del cliente. Por cada cadena habilitada:

```bash
python -m ingest.heb.load_stores --org sabritas tiendas-sabritas.xlsx
python -m ingest.heb.load_products --org sabritas productos-sabritas.xlsx
```

Los scripts insertan con el `org_id` correcto automáticamente.

### Paso 4 — Cargar histórico (si lo tiene)

```bash
# Últimos 30 días de inventario
for archivo in inventarios/*.xlsx; do
  python -m ingest.heb.load_inventory --org sabritas $archivo
done

# Ventas históricas
python -m ingest.heb.load_sales --org sabritas ventas-sabritas.xls

# OCs históricas
for archivo in OCs/*.xlsx; do
  python -m ingest.heb.load_po --org sabritas $archivo
done
```

### Paso 5 — Generar primer batch de sugeridos

```sql
select fn_run_engine((select id from organizations where slug = 'sabritas'));
```

### Paso 6 — Validar y enviar acceso

1. SQL: `select count(*) from suggested_orders where org_id = (...);`
2. Probar login en `app.rushdata.com.mx` con email del cliente
3. Enviar correo de bienvenida a Mario con credenciales
4. Mario hace primer onboarding call de 30 min con el cliente

### Paso 7 — Documentar en `docs/CLIENTS.md`

Llevar registro de cada cliente:
- Fecha onboarding
- Cadenas activas
- Plan
- Status (`pilot` / `active` / `paused` / `churned`)

---

## Flujo: AGREGAR CADENA COMERCIAL NUEVA (opción C del menú)

Cuando Mario diga "C" o "quiero agregar [cadena]":

### Paso 0 — Preguntas a Mario

```
¿Qué cadena vamos a agregar?

  1. Nombre comercial (ej: "Walmart México")
  2. Slug (ej: "walmart")
  3. ¿Calendario fiscal o gregoriano?
     - Fiscal = tiene periodos custom (HEB tiene 13 periodos/año)
     - Gregoriano = fechas normales (MERCO, ALSUPER)
  4. ¿Tienes archivos de ejemplo de la cadena para analizar formato?
     - Inventario
     - Ventas / sell-out
     - OCs
     - Catálogo de tiendas
```

### Paso 1 — Insertar chain en BD

```sql
insert into chains (slug, name, country, calendar_type)
values ('walmart', 'Walmart México', 'MX', 'gregorian');
```

Si es fiscal, también poblar `chain_calendars` con los periodos.

### Paso 2 — Analizar archivos del cliente

Leer `docs/INGEST_PATTERN.md` para entender el adapter pattern. Yo analizo los archivos con Python (como hice con HEB y MERCO) y respondo:

- Estructura real de columnas
- Formato de OC (wide / long / bulk)
- Particularidades (UPCs raros, headers dinámicos, PDFs)
- Riesgos identificados

### Paso 3 — Crear adapter `ingest/walmart/`

Crear scripts siguiendo el patrón:
- `config.py` — paths, headers esperados, versioning
- `load_stores.py`
- `load_inventory.py`
- `load_sales.py`
- `load_po.py`
- `README.md` — documentar formato real

Cada uno devuelve `Canonical*` rows (definidas en `ingest/shared/canonical.py`).

### Paso 4 — Validar adapter con datos reales

```bash
python -m ingest.walmart.load_inventory --org delikos --dry-run archivo.xlsx
```

`--dry-run` muestra qué insertaría sin tocar BD. Comparar conteos contra Excel original.

### Paso 5 — Definir reglas específicas de la cadena

Si la cadena tiene parámetros distintos del default:
- Cover target days (¿cuántos días de stock objetivo?)
- Lead time inicial estimado
- Reglas de packaging especiales
- Excluir CEDIS (si aplica)

Documentar en `ingest/walmart/README.md`.

### Paso 6 — Habilitar para clientes que vendan ahí

```sql
insert into org_chain_access (org_id, chain_id, enabled)
values (
  (select id from organizations where slug = 'delikos'),
  (select id from chains where slug = 'walmart'),
  true
);
```

### Paso 7 — Actualizar `CLAUDE.md` y `docs/INGEST_PATTERN.md`

- Agregar fila en tabla "Cadenas soportadas" de este archivo
- Agregar sección comparativa en `INGEST_PATTERN.md`

**Tiempo realista total:** 2-3 semanas por cadena nueva.

---

## Estructura del repo

```
PORTAL/
├── CLAUDE.md                    ← ESTE ARCHIVO (siempre leer primero)
├── .env.local                   ← 🔒 keys Supabase (gitignored)
├── .env.example                 ← template público
├── .gitignore                   ← bloquea secrets + data/source/ + raw files
├── docs/
│   ├── PLAN.md                  ← Paso a paso end-to-end del MVP
│   ├── SCHEMA.md                ← Modelo de datos canónico + decisiones
│   ├── INGEST_PATTERN.md        ← Cómo se aísla cada cadena (adapter pattern)
│   ├── FORMULAS.md              ← Motor de sugeridos (matemática base)
│   ├── KILLER_FEATURES.md       ← Features que diferencian (lost sale, OSA, lead time)
│   ├── FRONTEND.md              ← Sistema de diseño Handle/Savio + Plus Jakarta
│   ├── ROADMAP.md               ← Fases semana por semana
│   └── CLIENTS.md               ← (futuro) registro de clientes onboardeados
├── sql/
│   ├── 00_schema.sql            ← ✅ APLICADO — 16 tablas + RLS
│   ├── 01_seeds.sql             ← ✅ APLICADO (parcialmente, ver nota) — chains + calendario HEB
│   ├── 02_views.sql             ← ✅ APLICADO — vistas auxiliares motor
│   └── 03_functions.sql         ← ✅ APLICADO — motor de sugeridos v1
├── data/                        ← Mock data para la demo
│   ├── mock/                    ← 📄 CSVs públicos (versionados en repo)
│   │   ├── README.md            ← convenciones de carga
│   │   ├── 01_products.csv      ← 15 productos Sazonadores Vence Real
│   │   ├── 02_stores.csv        ← 63 tiendas HEB + 1 CEDIS
│   │   └── 03_product_packaging.csv ← empaque por cadena
│   └── source/                  ← 🔒 GITIGNORED — datos REALES de cliente actual
│       ├── README.md            ← política seguridad + flujo
│       ├── inventory_source.csv ← (cargado, mapped a mock)
│       ├── sales_source.csv     ← (cargado, mapped a mock)
│       └── purchase_orders_source.csv ← vacío (OCs generadas sintéticas)
├── ingest/                      ← Scripts Python de ingesta (futuro)
│   ├── shared/                  ← canonical.py + db.py compartidos
│   ├── heb/                     ← adapter HEB
│   ├── merco/                   ← adapter MERCO
│   └── alsuper/                 ← adapter ALSUPER
├── web/                         ← Next.js app (Fase 4 — pendiente)
└── .claude/                     ← config Claude Code
```

---

## Cómo trabajamos en cada sesión

Cuando Mario inicie una sesión sobre este proyecto:

1. **Leer este CLAUDE.md** para recordar contexto.
2. **Mostrar el menú de entrada** (sección arriba) si Mario no especifica qué quiere hacer.
3. **Leer el `docs/X.md`** relevante al tema (no leer todos — sería ruido).
4. **Si el cambio afecta varios docs** (ej: agregar una cadena nueva afecta SCHEMA + INGEST + FRONTEND), avisar a Mario antes de tocar.
5. **Actualizar el doc correspondiente** cuando se tome una decisión nueva.
6. **Nunca tocar `sql/00_schema.sql` sin avisar** — migraciones requieren cuidado. Hacer cambios en archivos numerados nuevos: `sql/04_add_chain_walmart.sql`.

### Reglas de oro

- **Schema canónico es sagrado.** Antes de agregar columna específica de una cadena, preguntar si se puede modelar genéricamente.
- **Multi-tenant SIEMPRE.** Toda query debe respetar `org_id`. RLS lo garantiza en Postgres; en frontend usar el cliente Supabase con sesión autenticada (nunca service_role en cliente).
- **Numeric, no Float.** Para dinero y unidades, usar `numeric(14,2)`. Float arrastra errores.
- **Fechas con timezone.** `timestamptz`, nunca `timestamp`. México UTC-6.
- **UPCs como `text`, no `bigint`.** UPCs con ceros líderes existen, y comparaciones de texto son seguras.
- **Una BD, muchos clientes.** No crear proyectos Supabase aparte por cliente (excepto enterprise que lo exija contractualmente).

---

## Cadenas soportadas

| Cadena | Slug | Estado | Notas |
|---|---|---|---|
| HEB / MITIENDA | `heb` | **MVP activo** | Calendario fiscal (13 periodos/año), 18 productos Delikos, 26 tiendas. OC formato wide. |
| MERCO | `merco` | Pendiente (post-MVP) | OC bulk a CEDIS, 32 GRANDES + 8 CHICAS, Super Roma excluir. Calendario gregoriano. |
| ALSUPER | `alsuper` | Pendiente | Solo inventario, sin sell-out, 87 tiendas + 2 CEDIS. |
| Walmart | `walmart` | Roadmap | TBD |
| Soriana | `soriana` | Roadmap | TBD |
| La Comer | `lacomer` | Roadmap | TBD |
| Chedraui | `chedraui` | Roadmap | TBD |

**MVP solo HEB.** Schema soporta las demás sin cambios estructurales.

---

## ⚡ Estrategia DEMO-FIRST (decidida 2026-05-12)

**Cambio de plan:** En lugar de construir el MVP directo con datos reales de Delikos, primero construimos una **demo vendible** con mock data que se enseña a clientes prospecto. Cuando entren clientes reales (Delikos incluido), replicamos el flujo con sus datos reales.

### Por qué demo-first

1. Permite vender ANTES de tener clientes reales operando
2. No expone datos sensibles de Delikos en presentaciones comerciales
3. Datos curados muestran las capacidades del producto en su mejor luz
4. Cuando entre cliente real, el SaaS ya está en producción y solo se hace onboarding

### Org demo activa: Sazonadores Vence Real

| Campo | Valor |
|---|---|
| Slug | `sazonadores-vence-real` |
| Plan | `demo` |
| Cadena | HEB |
| Tipo data | Mock B2 (realista pero ficticia — nombres reales de tiendas, productos inventados, volúmenes verosímiles) |

### Flujo de carga de mock data

Los datos viven en `PORTAL/data/mock/` como CSVs versionados. Carga capa por capa:

1. `01_products.csv` → tabla `products`
2. `02_stores.csv` → tabla `stores`
3. `03_product_packaging.csv` → tabla `product_packaging`
4. `04_inventory.csv` → tabla `inventory_snapshots`
5. `05_sales.csv` → tabla `sales`
6. `06_purchase_orders.csv` → tabla `purchase_orders`
7. `07_purchase_order_lines.csv` → tabla `purchase_order_lines`

**Por cada CSV:**
1. Claude crea plantilla con headers + 2-3 filas de ejemplo
2. Mario llena en Numbers/Excel, exporta CSV
3. Claude carga a Supabase vía MCP con `service_role`
4. Validan conteos juntos

Ver `data/mock/README.md` para convenciones (UTF-8, fechas YYYY-MM-DD, etc.).

---

## Clientes (orgs activas)

| Cliente | Slug | Plan | Cadenas | Status | Onboarded |
|---|---|---|---|---|---|
| Sazonadores Vence Real | `sazonadores-vence-real` | demo | HEB | en construcción | 2026-05-12 |
| Delikos | `delikos` | pilot | HEB | post-demo | TBD |

> Cuando entren más clientes, mantener tabla aquí + detalle en `docs/CLIENTS.md`.

---

## Personas en el contexto de Mario

- **Mario Peña** — Owner del proyecto (KAM Delikos, fundador RushData)
- **Patricio Medrano** — Responsable abasto MERCO (no aplica MVP)
- **Jesús Núñez** — Jefe de Mario en Delikos (Delikos = primer cliente / pilot)

---

## Glosario

- **DDI** — Días De Inventario. `inventario_actual / venta_promedio_diaria`
- **DOS** — Days Of Supply. Sinónimo de DDI (HEB lo llama DOS).
- **OC** — Orden de Compra (Purchase Order, PO).
- **PDQ** — Pre-pack display HEB; presentación que mezcla 3 sabores.
- **Sell-in** — Lo que la empresa factura al retailer (ERP interno).
- **Sell-out** — Lo que el retailer vende al consumidor final (datos del portal).
- **Fill rate** — `unidades_recibidas / unidades_pedidas` de una OC.
- **Quiebre / stockout** — DDI=0 en una tienda para un producto.
- **CEDIS** — Centro de distribución del retailer.
- **OSA** — On-Shelf Availability. Producto realmente disponible en anaquel (vs solo en inventario sistémico).
- **Phantom stockout** — Inventario sistémico > 0 pero ventas = 0 por días. Producto perdido en bodega.
- **Lead time** — Días entre orden de compra y recepción en tienda.
- **Adapter** — Capa Python que traduce formato de cadena a schema canónico (ver `INGEST_PATTERN.md`).

---

## Referencias visuales

- **Handle** (handle.com) — Data-dense, números grandes, sidebar minimalista
- **Savio** (saviohq.com) — Sobrio, cards compactas, jerarquía clara
- **Notion** — Tipografía Plus Jakarta, espacios generosos
- **Linear** — Velocidad percibida, transitions suaves, palette restraint
- **Vercel dashboard** — Cards data-dense con sparklines inline

**Tono visual decidido:** Handle/Savio (data-dense). Ver `docs/FRONTEND.md`.

---

## Estado actual del proyecto

### Diseño y documentación
- [x] Decisiones de stack (12 mayo 2026)
- [x] CLAUDE.md con menú + flujos onboarding/cadena nueva
- [x] Plan paso a paso (`docs/PLAN.md`)
- [x] Schema canónico (`docs/SCHEMA.md` + `sql/00_schema.sql`)
- [x] Patrón adapter para cadenas (`docs/INGEST_PATTERN.md`)
- [x] Fórmulas motor sugeridos (`docs/FORMULAS.md`)
- [x] Killer features documentados (`docs/KILLER_FEATURES.md`)
- [x] Guía frontend (`docs/FRONTEND.md`)
- [x] Roadmap (`docs/ROADMAP.md`)
- [x] Seeds con calendario HEB (`sql/01_seeds.sql`)

### Fase 0 — Setup (completada 2026-05-12)
- [x] Cuenta Supabase creada (proyecto `rushdata-portal`, ref `qsxetwkwdsylfweatlhp`)
- [x] `.env.local` con keys + `.gitignore` blindado
- [x] MCP Supabase registrado y autenticado
- [ ] Repo GitHub `rushdatamx/portal` (diferido — se crea cuando exista código que subir)
- [ ] DNS `app.rushdata.com.mx` (Fase 5)

### Fase 1 — Database (completada 2026-05-12)
- [x] Schema aplicado (16 tablas, RLS habilitado en todas)
- [x] Migración extra: `stores.cluster` (10 clusters reales HEB: AA, AA Light, A, B, C, B Frontera, B Bajío, etc.)
- [x] Migración extra: grants `service_role` + `authenticated` (Supabase no los da auto cuando "auto-expose new tables" está OFF)
- [x] Seeds globales aplicados (3 chains, 26 periodos HEB)
- [x] Org demo "Sazonadores Vence Real" creada
- [x] Estructura `data/mock/` + `data/source/` con READMEs
- [x] 15 productos cargados (sazonadores 100/250gr + carne seca, costos = precio venta -30%)
- [x] 63 tiendas + 1 CEDIS cargados con datos reales de HEB (clusters, regiones, ciudades, estados)
- [x] 15 product_packaging configurados (24/caja para 100gr, 12/caja para 250gr, 6/caja carne seca)
- [x] **15,424 inventory_snapshots** cargados (29 días, 9 SKUs × 63 tiendas, mapeados de archivo real)
- [x] **83,123 sales** cargadas (16 meses: 2025-01 → 2026-04, recalculadas con precios Sazonadores)
- [x] **70 purchase_orders + 7,395 lines** generadas sintéticamente (semanales con estacionalidad)
- [ ] Usuario admin Mario en Supabase Auth (diferido — se hace cuando necesitemos enseñar la demo)
- [ ] RLS validado con queries de prueba (diferido — coincide con admin user)

### Fase 3 — Motor de sugeridos (completada 2026-05-12)
- [x] `sql/02_views.sql` — 6 vistas: vw_latest_inventory, vw_velocity_28d, vw_velocity_7d, vw_active_pos_pending, vw_inventory_with_velocity, vw_active_stockouts
- [x] `sql/03_functions.sql` — 5 funciones: fn_cover_target_days, fn_compute_stockouts, fn_compute_suggestions, fn_compute_daily_kpis, fn_run_engine
- [x] Primer run ejecutado: **110 sugeridos generados, 3 stockouts, 1 KPI snapshot**
- [ ] pg_cron configurado (diferido — para producción)

### Fase 4 — Frontend (completada 2026-05-12 — falta auth)
- [x] Scaffold Next.js 16.2 + Tailwind v4 + React 19 en `web/`
- [x] Tokens de diseño Handle/Savio en `globals.css` + fuentes Plus Jakarta Sans + JetBrains Mono
- [x] Cliente Supabase server-only con `service_role` (`lib/supabase/server.ts`)
- [x] Symlink `web/.env.local → ../.env.local`
- [x] Layout app-shell: Sidebar 220px con active state desde `usePathname()`, Topbar 56px
- [x] Componentes UI: `KPICard`, `Card`, `SeverityBadge`, `ReasonBadge`, `Sparkline` (SVG inline), `BarChart` (SVG/divs SSR-friendly)
- [x] Página `/` Home — hero "Venta perdida potencial", 3 KPICards, top accionables, alertas
- [x] Página `/sugeridos` — 110 sugeridos con filtros URL (razón + DDI≤3), links a detail
- [x] Página `/tiendas` — 64 cards clickables con filtros cluster/región
- [x] Página `/productos` — 15 SKUs ordenados por venta, sparklines 8 sem, filas clickables
- [x] Página `/oc` — historia comercial: hero $36M movido, BarChart 17 meses, top tiendas/productos, OCs recientes
- [x] Página `/tiendas/[id]` — header tienda + KPIs + tabla SKUs con sparklines + sugeridos + OCs
- [x] Página `/productos/[id]` — header + KPIs + BarChart mensual + sugeridos + tabla tiendas
- [ ] Auth flow magic link (diferido — demo corre sin login en MVP)
- [ ] Deploy a Vercel
- [ ] DNS app.rushdata.com.mx

### Pendientes futuros
- [ ] Auth + RLS validation (antes de exponer a prospectos)
- [ ] Deploy Vercel + DNS
- [ ] Demo lista para mostrar a prospectos
- [ ] Onboarding Delikos con datos reales (post-demo)

---

## Estado de datos en Supabase (al 2026-05-12)

Proyecto: `rushdata-portal` (ref `qsxetwkwdsylfweatlhp`)

| Tabla | Filas | Notas |
|---|---|---|
| `chains` | 3 | HEB, MERCO, ALSUPER |
| `chain_calendars` | 26 | P01-2025 → P13-2026 |
| `organizations` | 1 | Sazonadores Vence Real |
| `org_chain_access` | 1 | HEB habilitado |
| `products` | 15 | precios: 100gr=$79, 250gr=$169, carne=$369. costos = -30% |
| `product_packaging` | 15 | múltiplos validados |
| `stores` | 64 | 63 + 1 CEDIS, 10 clusters, 7 estados, 3 regiones |
| `inventory_snapshots` | 15,424 | 29 días (2026-04-08 → 2026-05-06) |
| `sales` | 83,123 | 16 meses (2025-01-01 → 2026-04-30), YoY funcional |
| `purchase_orders` | 70 | semanales, estacionalidad jul-dic |
| `purchase_order_lines` | 7,395 | 100% recibido (fill rate 100%) |
| `suggested_orders` | 110 | generados por motor v1 |
| `stockout_alerts` | 3 | activos |
| `daily_kpis` | 1 | snapshot del 2026-05-12 |
| `users` | 0 | (no se ha creado admin todavía) |
| `ingestion_runs` | 0 | (no usado — carga manual via Python) |

**Total filas:** ~106,000

### Funciones SQL adicionales (creadas en Fase 4)

| Función | Uso |
|---|---|
| `fn_store_kpis(uuid)` | KPIs agregados por tienda para listing |
| `fn_product_kpis(uuid)` | KPIs agregados por producto para listing |
| `fn_product_weekly_sales(uuid, int)` | Serie semanal por producto (sparkline) |
| `fn_po_monthly(uuid)` | Timeseries mensual de OCs |
| `fn_po_top_stores(uuid, int)` | Ranking tiendas por valor OC |
| `fn_po_top_products(uuid, int)` | Ranking productos por valor OC |
| `fn_store_detail_skus(uuid, uuid)` | SKUs con DDI/velocity/stock por tienda |
| `fn_product_detail_stores(uuid, uuid)` | Tiendas con stock/venta por producto |
| `fn_store_product_weekly(uuid, uuid, int)` | Serie semanal por tienda+producto |

Todas con grants a `authenticated` y `service_role`.

---

## Arquitectura del frontend (`web/`)

### Stack real instalado
- **Next.js 16.2.6** + **React 19.2** + **Tailwind v4** (Turbopack)
- **TypeScript 5**, App Router, `src/` dir
- **@supabase/supabase-js** + **@supabase/ssr** (auth pendiente)
- **lucide-react** 1.x (iconos)
- **clsx** + **tailwind-merge** (cn helper)
- **recharts** 3.x — instalado pero NO usado (sparklines son SVG nativos)
- **server-only** (asegura que cliente service_role nunca llegue al cliente)

### Decisiones de diseño que NO se cambian sin avisar
- **Recharts descartado para SSR** — usa `ResponsiveContainer` que falla en server render (`width(-1) height(-1)`). Sparkline y BarChart son SVG/divs nativos. Recharts queda instalado por si hace falta para charts complejos (heatmap).
- **Tremor descartado** — requiere React 18 + Tailwind v3. Incompatible con el stack actual. Construimos componentes propios siguiendo `docs/FRONTEND.md`.
- **Sin auth en demo MVP** — Service_role solo en server components, nunca expuesto al cliente. RLS sigue activo, los lectores explícitos pasan `org_id` filtrado en SQL.
- **Filtros vía URL search params + Server Components** — sobrevive refresh y copy-paste de URL, sin estado cliente.
- **Botones pill para filtros**, no `<select>` — feel data-dense Handle/Savio.
- **Sidebar es Client Component** con `usePathname()` para el active state. Todo lo demás es Server Component.

### Estructura del repo `web/`

```
web/
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← Sidebar + Topbar + main
│   │   ├── globals.css         ← tokens Handle/Savio + @theme inline
│   │   ├── page.tsx            ← Home (/)
│   │   ├── sugeridos/page.tsx
│   │   ├── tiendas/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── productos/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   └── oc/page.tsx
│   ├── components/
│   │   ├── layout/{Sidebar,Topbar}.tsx
│   │   └── ui/{Card,KPICard,SeverityBadge,ReasonBadge,Sparkline,BarChart}.tsx
│   └── lib/
│       ├── utils.ts            ← cn, fmtMXN, fmtNumber, fmtDecimal, fmtPct
│       ├── supabase/server.ts  ← supabaseAdmin(), getDemoOrgId()
│       └── queries/
│           ├── home.ts
│           ├── suggestions.ts
│           ├── stores.ts
│           ├── products.ts
│           ├── po.ts
│           ├── store-detail.ts
│           └── product-detail.ts
├── .env.local                  ← symlink → ../.env.local
└── package.json
```

### Rutas activas

| Ruta | Server Component | Notas |
|---|---|---|
| `/` | sí | Home con hero + 3 KPIs + top accionables + alertas |
| `/sugeridos` | sí | Filtros URL: `?reason=stockout_risk&severity=critical` |
| `/tiendas` | sí | Filtros: `?cluster=AA&region=Norte` |
| `/tiendas/[id]` | sí | Detail por tienda con SKUs+sparkline, sugeridos, OCs |
| `/productos` | sí | Sparklines 8 sem, filas linkean a detail |
| `/productos/[id]` | sí | Detail con BarChart mensual + tabla tiendas linkable |
| `/oc` | sí | Historia comercial: 17 meses, top tiendas/productos, OCs recientes |

Dev server: `npm run dev` en `web/` → http://localhost:3000 (o 3003 si está ocupado).

---

## Decisiones clave tomadas en sesión 2026-05-12

1. **Demo-first sobre MVP Delikos real** — primero construir demo vendible con mock data, luego onboardear clientes reales.
2. **MCP de Supabase activo** — registrado en scope `user`. Permite a Claude correr SQL/migraciones directo.
3. **Cluster como columna en stores** — agregada vía migración (`alter table stores add column cluster text`). Modelar el cluster de HEB (AA, AA Light, A, B, C, etc.) como dato de primera clase.
4. **Grants explícitos a service_role** — Supabase con "auto-expose new tables" OFF no da grants auto. Aplicados en migración `grant_service_role_access`.
5. **Mock data realista vía mapeo** — Mario pasa archivos REALES de Delikos (en `data/source/`, gitignored) y Claude reemplaza UPCs + nombres + precios para producir data demo en `org = sazonadores-vence-real`.
6. **OCs sintéticas con estacionalidad** — Las OCs no se mapean de reales (eran pocas y formato wide), se generan programáticamente respetando case packs y estacionalidad jul-dic.
7. **100% fill rate en OCs demo** — Se asume `units_received = units_ordered` porque la cantidad real recibida es difícil de saber.
8. **UPCs como text, no number** — confirmado que abrir CSVs en Numbers/Excel rompe los UPCs largos a notación científica. Reglas: descargas del portal NO se abren en Excel, archivos manuales usar VS Code/TextEdit, plantillas pueden venir con `'7501230...` para forzar texto.
9. **Inventarios negativos posibles** — el reporte real de HEB a veces trae inventario negativo (desfase de captura). No es bug nuestro, hay que decidir si normalizar a 0 en frontend.
10. **Cover target por categoría** — sazonadores=21 días, carne_seca=14 días (premium, alto valor).
11. **Tremor descartado, Recharts solo instalado** — Tremor requiere React 18 + Tailwind v3, incompatible. Recharts falla en SSR. Construimos KPICard/Sparkline/BarChart propios con SVG inline.
12. **Demo corre sin auth** — Service_role en server components, RLS activa, queries pasan `org_id` explícito. Auth se mete antes de exponer a prospectos.
13. **Filtros vía URL search params** — sin estado cliente, sobrevive refresh, links compartibles.
14. **Sidebar es el único Client Component del shell** — todo lo demás Server Components con `force-dynamic` para data fresca.
15. **OC enfocado como "historia comercial"** no como "fill rate dashboard" — porque el fill rate sintético es 100% en todas las OCs. Hero = valor total movido, BarChart de 17 meses muestra estacionalidad jul-dic.
16. **Bug fix en home.ts** — el filtro inicial era `status='pending'` pero el motor genera `status='new'`. Corregido en todas las queries de sugeridos.

---

**Última actualización:** 2026-05-12 (Fase 4 frontend completa, sin auth)

**Próximo paso al volver:** Decidir entre (a) Auth + RLS validation (necesario antes de prospectos), (b) Deploy Vercel + DNS, (c) Polishing visual de la demo, (d) Saltar a agregar adapter MERCO o cliente real Delikos.
