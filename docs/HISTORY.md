# PORTAL — Historial

> Snapshots históricos del proyecto. **Vive aquí para que `CLAUDE.md` no pese.** Este archivo no se lee cada sesión; se consulta si Mario o Claude necesita verificar algo del pasado.

---

## Estado de fases (al 2026-05-12)

### Fase 0 — Setup (completada 2026-05-12)
- [x] Cuenta Supabase creada (proyecto `rushdata-portal`, ref `qsxetwkwdsylfweatlhp`)
- [x] `.env.local` con keys + `.gitignore` blindado
- [x] MCP Supabase registrado y autenticado
- [x] Repo GitHub `rushdatamx/app-rushdata` creado y conectado vía SSH
- [ ] DNS `app.rushdata.com.mx` (pendiente — apuntar a Vercel)

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
- [x] Usuario admin `mario@rushdata.com.mx` creado y vinculado a Sazonadores como `admin` (Fase 5)
- [x] RLS validado con queries de prueba — segundo user de otra org ve 0 filas en las 10 tablas (Fase 5)

### Fase 3 — Motor de sugeridos (completada 2026-05-12)
- [x] `sql/02_views.sql` — 6 vistas: vw_latest_inventory, vw_velocity_28d, vw_velocity_7d, vw_active_pos_pending, vw_inventory_with_velocity, vw_active_stockouts
- [x] `sql/03_functions.sql` — 5 funciones: fn_cover_target_days, fn_compute_stockouts, fn_compute_suggestions, fn_compute_daily_kpis, fn_run_engine
- [x] Primer run ejecutado: **110 sugeridos generados, 3 stockouts, 1 KPI snapshot**
- [ ] pg_cron configurado (diferido — para producción)

### Fase 4 — Frontend (completada 2026-05-12)
- [x] Scaffold Next.js 16.2 + Tailwind v4 + React 19 en `web/`
- [x] Tokens de diseño Handle/Savio en `globals.css` + fuentes Plus Jakarta Sans + JetBrains Mono
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
- [x] Sidebar: links `/ingesta`, `/equipo`, `/ajustes` marcados como "pronto" (no rotos)

### Fase 5 — Auth + Deploy (completada 2026-05-12)
**BD (Supabase Auth):**
- [x] `auth_org_id()` optimizada para leer `app_metadata.org_id` del JWT (con fallback a `public.users`)
- [x] Trigger `trg_sync_user_org_to_jwt` — copia `org_id` y `role` de `public.users` a `auth.users.raw_app_meta_data` automáticamente
- [x] Helper SQL `admin_create_user(email, org_slug, role)` — crea user en `auth.users` + `auth.identities` + `public.users` con todos los campos string inicializados (evita bug GoTrue)
- [x] User `mario@rushdata.com.mx` creado, role `admin`, vinculado a Sazonadores
- [x] Aislamiento RLS validado: con `SET LOCAL ROLE authenticated` + JWT de otra org → **0 filas en las 10 tablas**

**Frontend (Next 16 con SSR auth):**
- [x] `proxy.ts` en root de `web/` — protege rutas, refresca tokens. En Next 16 reemplaza `middleware.ts`
- [x] `lib/supabase/ssr.ts` — `supabaseServer()` con cookies async
- [x] `lib/supabase/browser.ts` — `supabaseBrowser()` para Client Components
- [x] `lib/dal.ts` — `verifySession()` y `getSessionSoft()` con React `cache()` para memoización
- [x] `/login` con magic link (`signInWithOtp`) + `/auth/callback` route handler
- [x] Logout en Topbar vía Server Action (`signOutAction`)
- [x] 7 queries migradas: ya no usan `service_role`; usan `supabaseServer()` y RLS filtra por JWT
- [x] `lib/supabase/server.ts` (cliente service_role viejo) **eliminado** — no más service_role en frontend

**Deploy:**
- [x] Git init en `PORTAL/`, primer commit con todo el código
- [x] Push a `github.com:rushdatamx/app-rushdata.git` vía SSH (key ed25519 generada)
- [x] Vercel project conectado al repo, Root Directory = `web`, Framework = Next.js, Node 22.x
- [x] Env vars en Vercel: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
- [x] Demo viva en **https://app-rushdata.vercel.app** — login funciona end-to-end
- [x] Supabase Auth URL Configuration: redirect URLs incluyen tanto localhost:3003 como app-rushdata.vercel.app

---

## Estado de datos en Supabase (snapshot 2026-05-12)

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
| `users` | 1 | mario@rushdata.com.mx (admin, Sazonadores) |
| `ingestion_runs` | 0 | (no usado — carga manual via Python) |

**Total filas:** ~106,000

> Para conteos actuales: `select count(*) from <tabla>` vía MCP Supabase.

---

## Funciones SQL (catálogo al 2026-05-12)

### Funciones del motor de sugeridos (Fase 3)

| Función | Uso |
|---|---|
| `fn_cover_target_days(text)` | Devuelve días de cobertura objetivo por categoría |
| `fn_compute_stockouts(uuid)` | Recalcula alertas de quiebre |
| `fn_compute_suggestions(uuid)` | Genera batch de sugeridos |
| `fn_compute_daily_kpis(uuid)` | Snapshot diario para home |
| `fn_run_engine(uuid)` | Orquesta los 3 anteriores |

### Funciones para frontend (Fase 4)

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

### Funciones de auth (Fase 5)

| Función | Uso |
|---|---|
| `auth_org_id()` | Lee `org_id` del JWT `app_metadata`; fallback a `public.users`. Usado en todas las RLS policies |
| `sync_user_org_to_jwt()` | Trigger que copia `org_id` + `role` de `public.users` a `auth.users.raw_app_meta_data` |
| `admin_create_user(email, org_slug, role)` | Helper completo para onboarding: crea `auth.users` + `auth.identities` + `public.users` con todos los campos string inicializados |

Todas con grants a `authenticated` y `service_role`.

---

## Arquitectura del frontend (`web/`) — snapshot 2026-05-12

### Stack instalado
- **Next.js 16.2.6** + **React 19.2** + **Tailwind v4** (Turbopack)
- **TypeScript 5**, App Router, `src/` dir
- **@supabase/supabase-js** + **@supabase/ssr** (auth con cookies de sesión)
- **lucide-react** 1.x (iconos)
- **clsx** + **tailwind-merge** (cn helper)
- **recharts** 3.x — instalado pero NO usado (sparklines son SVG nativos)
- **server-only** (asegura que código server-only no llegue al cliente)

### Estructura

```
web/
├── proxy.ts                    ← Next 16: protege rutas, refresca tokens
├── src/
│   ├── app/
│   │   ├── layout.tsx          ← Sidebar + Topbar + main
│   │   ├── globals.css         ← tokens Handle/Savio + @theme inline
│   │   ├── page.tsx            ← Home (/)
│   │   ├── login/{page.tsx, layout.tsx}
│   │   ├── auth/
│   │   │   ├── callback/route.ts ← exchange code → session cookie
│   │   │   └── actions.ts      ← signOutAction
│   │   ├── sugeridos/page.tsx
│   │   ├── tiendas/{page.tsx, [id]/page.tsx}
│   │   ├── productos/{page.tsx, [id]/page.tsx}
│   │   └── oc/page.tsx
│   ├── components/
│   │   ├── layout/{Sidebar,Topbar}.tsx
│   │   └── ui/{Card,KPICard,SeverityBadge,ReasonBadge,Sparkline,BarChart}.tsx
│   └── lib/
│       ├── utils.ts            ← cn, fmtMXN, fmtNumber, fmtDecimal, fmtPct
│       ├── dal.ts              ← verifySession(), getSessionSoft()
│       ├── supabase/{ssr,browser}.ts
│       └── queries/            ← 7 queries
```

### Rutas

| Ruta | Server Component | Notas |
|---|---|---|
| `/` | sí | Home con hero + 3 KPIs + top accionables + alertas |
| `/sugeridos` | sí | Filtros URL: `?reason=stockout_risk&severity=critical` |
| `/tiendas` | sí | Filtros: `?cluster=AA&region=Norte` |
| `/tiendas/[id]` | sí | Detail por tienda con SKUs+sparkline, sugeridos, OCs |
| `/productos` | sí | Sparklines 8 sem, filas linkean a detail |
| `/productos/[id]` | sí | Detail con BarChart mensual + tabla tiendas linkable |
| `/oc` | sí | Historia comercial: 17 meses, top tiendas/productos, OCs recientes |
| `/login` | no (Client) | UI magic link, pública |
| `/auth/callback` | route handler | Exchange code → session cookie |

---

## Deploy + DevOps

### Producción

- **Frontend:** Vercel — proyecto `app-rushdata` (team `rushdatamx`)
  - Repo: `github.com:rushdatamx/app-rushdata` (rama `main` = production)
  - Root Directory: `web`
  - Framework Preset: **Next.js** (no "Other")
  - Node.js Version: **22.x** (Node 24 puede romper Next 16)
  - URL: **https://app-rushdata.vercel.app**
- **Backend:** Supabase proyecto `rushdata-portal` (ref `qsxetwkwdsylfweatlhp`)
- **Dominio custom:** `app.rushdata.com.mx` pendiente

### Variables de entorno en Vercel

| Variable | Tipo | Notas |
|---|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | pública | URL del proyecto Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | pública | Anon key — RLS protege los datos |
| `SUPABASE_SERVICE_ROLE_KEY` | secreta | Server-side only. NO se usa en frontend actual |

### Supabase Auth — URL Configuration

```
http://localhost:3003/**
http://localhost:3003/auth/callback
https://app-rushdata.vercel.app/**
https://app-rushdata.vercel.app/auth/callback
```

Cuando se monte `app.rushdata.com.mx`: agregar `https://app.rushdata.com.mx/**` y `https://app.rushdata.com.mx/auth/callback`, y cambiar **Site URL** a ese dominio.

### Git workflow

- SSH key ed25519 (`~/.ssh/id_ed25519`) registrada en la org `rushdatamx` de GitHub
- Push directo a `main` despliega a producción en Vercel
- `web/.git` interno **borrado** durante el setup (era el `.git` que `create-next-app` mete; el repo principal vive en `PORTAL/.git`)

### Gotchas del deploy inicial

1. **Brew no estaba instalado** — usar `npm install -g` con sudo si hace falta, o hacer todo desde el browser.
2. **Vercel detectó Framework = "Other"** en lugar de Next.js cuando Root Directory es `web`. Cambiar manualmente.
3. **Node 24.x viene por default** en Vercel ahora, pero Next 16 funciona mejor con 22.x
4. **`auth.users` insertado vía SQL libre causa "500: Database error finding user"** — GoTrue espera tokens como `''`, no NULL. Resuelto con `admin_create_user()`.
5. **`email rate limit exceeded`** aparece cuando se piden muchos magic links seguidos. Default Supabase: ~4 / hora. Se quita solo o se sube en Auth → Rate Limits.

---

## Decisiones clave — sesión 2026-05-12

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
12. **Demo corre sin auth (al inicio)** — luego se metió auth completa en Fase 5.
13. **Filtros vía URL search params** — sin estado cliente, sobrevive refresh, links compartibles.
14. **Sidebar es el único Client Component del shell** — todo lo demás Server Components con `force-dynamic` para data fresca.
15. **OC enfocado como "historia comercial"** no como "fill rate dashboard" — porque el fill rate sintético es 100% en todas las OCs. Hero = valor total movido, BarChart de 17 meses muestra estacionalidad jul-dic.
16. **Bug fix en home.ts** — el filtro inicial era `status='pending'` pero el motor genera `status='new'`. Corregido en todas las queries de sugeridos.
17. **Auth con JWT app_metadata, no lookup en BD** — `auth_org_id()` lee `app_metadata.org_id` del JWT (sin query) con fallback a `public.users` para el primer login. Trigger en `public.users` mantiene `auth.users.raw_app_meta_data` sincronizado.
18. **`proxy.ts` reemplaza `middleware.ts` en Next 16** — la función exportada se llama `proxy` (no `middleware`).
19. **`cookies()` es async en Next 16** — todos los helpers que leen cookies deben usar `await cookies()`.
20. **service_role eliminado del frontend** — el archivo `lib/supabase/server.ts` fue borrado. Todas las queries usan cliente SSR autenticado. RLS es la única protección de datos (validada con segundo user de otra org → 0 filas).
21. **Helper `admin_create_user()` SQL** — onboardear nuevos clientes ahora es `select public.admin_create_user('email', 'org-slug', 'role')`. Evita el bug de GoTrue con tokens NULL.
22. **Vercel Framework Preset = Next.js (no Other)** — cuando Root Directory es `web/`, Vercel a veces deja "Other" como preset y el build pasa pero no construye la app.
23. **Demo viva en producción** — `https://app-rushdata.vercel.app` con auth funcionando. Login: `mario@rushdata.com.mx` con magic link.

---

## Sesión 2026-05-13 / 14 — Densificación KAM-first + vista /forecast

**Objetivo de la sesión:** Crear el mejor portal de análisis y toma de decisiones para retail. Comparación contra Celes (competencia, lado retailer) y rediseño de las 5 vistas existentes + nueva vista `/forecast`.

**Commit:** `24f0b10` en `main`. 38 archivos, +3148/-454 líneas. Pusheado a Vercel.

### Análisis competitivo Celes (`celes.ai`)

5 módulos de Celes auditados: Demand Planning, Store Replenishment, Purchasing, Autopilot (3 agentes IA), CelesLink.

- **Celes = lado retailer** (cliente: Tiendas Neto, Olímpica, Cruz Verde). Decide qué comprar y cómo distribuir a sus tiendas.
- **RushData = lado proveedor** (Delikos vendiendo a HEB). Mismos datos pero perspectiva opuesta.
- **Lo que podemos copiar (70%):** forecast SKU×tienda, precisión MAPE, fill rate, lead time real, anomalías, promociones detectadas, calendario de pedidos.
- **Lo que no (cosas del retailer):** capacidad camión, distribución CEDIS→tiendas, cross-docking, ejecutar OC a ERP del retailer.
- **Nuestro moat vs Celes:** margen proveedor (Celes no ve costo), detector de OC sub-óptima, phantom stockouts, fill rate cadena→proveedor, Lost Sale Ledger, comparativos cross-cadena.

Ver detalle de features clonables en chat de la sesión.

### Rediseño de las 5 vistas (foco: densidad + accionable)

**Home (`/`):**
- `HomeHeader.tsx` con saludo dinámico por hora + franja densa de 3 cards (quiebres activos, $ en riesgo, 1er movimiento del día). Cada card linkea a su ruta.
- `PriorityTable.tsx` convertida a Client Component con tabs ("Por reabastecer" / "En quiebre ahora") — fusiona la antigua `UnresolvedAlertsTable.tsx` (eliminada). Columnas razón + cluster + DDI con sevBadge + subtotal con % del total.
- `SubKpiStrip.tsx` reescrita: 4 KPIs accionables linkeados (Tiendas en riesgo → `/tiendas?status=critical`, SKUs con quiebre → `/productos?status=risk`, Fill rate vigente → `/oc`, Cobertura semanas → `/productos`). Cada uno con tone semántico.
- `LostSaleLedger.tsx` **nuevo**: card hero al final del Home con $ acumulado YTD por sugeridos no cumplidos + barchart mensual + proyección anual. Justifica ROI del SaaS.
- Backend extendido: `home.ts` ahora trae `storeCluster` en top suggestions, sube limit a 10. `home-stats.ts` agrega `storesWithStockout`, `productsWithStockout`, `coverageWeeks`.
- Nueva query: `lib/queries/lost-sale-ledger.ts` (suma de `daily_kpis.total_lost_sale_estimate` agrupado por mes desde inicio de año).

**`/sugeridos`:**
- `SugeridosHero.tsx` rediseñado: barra apilada horizontal por severidad ($ riesgo, no count). Cada segmento clickable cuando aplica (segmentos critical/high filtran `?severity=critical`). Sparkline pequeño 14d arriba a la derecha. KPI "Críticos+Altos" ahora linkeable y muestra % del riesgo total.
- `SugeridosFilters.tsx` — chips de razón con contador inline (`Riesgo quiebre · 12`). Chips con count=0 se ocultan automáticamente.
- Bug "X de X" arreglado en `page.tsx` → ahora dice "X de Y · filtros activos" usando `unfilteredCount`.
- Backend: `loadSuggestions()` devuelve también `unfilteredCount` y `reasonCounts` (por reason_code sobre universo completo).

**`/tiendas` + `/tiendas/[id]`:**
- `TiendasFilters.tsx`: Select de status → chips con dot + contador + activeBg semántico por estado.
- `TiendasHero.tsx`: nuevo KPI "Concentración top 5 tiendas" (% del revenue) reemplaza "Tiendas activas" decorativo.
- `stores.ts`: `StoreRow` ahora tiene `avgDdi` (calculado client-side de `inventoryUnits / (units30d/30)`).
- `TiendasGrid.tsx`: footer de la card muestra DDI prom (con fallback a unidades 30d).
- `TiendasTable.tsx`: nueva columna "DDI prom" con tone por umbral.
- `StoreDetailHero.tsx`: KPIs reemplazados → Fill rate histórico + Lead time promedio (anti-cadena). Delta semanal % junto al hero number.
- `store-detail.ts`: trae `expected_delivery_date` en OCs, calcula `avgFillRate`, `avgLeadTimeDays`, `inventoryValue` (suma `inventory * unitPrice`).

**`/productos` + `/productos/[id]`:**
- `ProductosFilters.tsx`: chips de status (Estrellas/Riesgo/Dormidos) con contador.
- `ProductosHero.tsx`: KPI "Margen 30d" en $MXN + % sobre venta reemplaza "SKUs activos" decorativo.
- `ProductDetailHero.tsx`: delta MoM (mes vs mes previo) junto al hero number.
- `page.tsx` calcula `totalMargin = sum(revenue30d - unitCost * units30d)` y `statusCounts` (count por status sobre universo cat+search, sin status).

**`/oc`:**
- `OCFilters.tsx`: chips de status con dots de color por estado (pending=amber, partial=orange, fulfilled=emerald, cancelled=foreground).
- `OCHero.tsx`: nuevo KPI **killer feature anti-cadena** "OCs sub-surtidas <90%" (linkeable a `?status=partial`). Reemplaza "OCs activas" decorativo. Brecha % junto al hero number con tone semántico.
- `po.ts`: agrega `underFillCount` (OCs cerradas con fillRate < 0.9, excluye pending/cancelled) y `statusCounts`.

### Nueva vista `/forecast` (clon Celes adaptado lado proveedor)

**Pregunta KAM:** "¿Cuánto voy a vender la próxima semana / mes / siguiente periodo, y cómo se compara con lo histórico?"

**Archivos creados:**
- `lib/queries/forecast.ts` — query + algoritmo
- `components/forecast/ForecastHero.tsx` — chart + 4 KPIs
- `components/forecast/ForecastSubKpis.tsx` — 4 cards comparables
- `components/forecast/ForecastTable.tsx` — top 15 SKUs
- `app/forecast/page.tsx` + `loading.tsx`
- Item en `AppSidebar.tsx` (grupo Principal, icono `Sparkles`)

**Estructura visual:**
- **Chart compuesto (Recharts `ComposedChart`):** 3 series sobre el mismo eje X (90 días retrocedidos + 30 proyectados)
  - `actual`: área emerald sólida (90d)
  - `forecast`: área charcoal con stroke punteado (30d futuros)
  - `yoy`: línea gris fina mismo periodo año anterior (todo el rango)
  - `ReferenceLine` vertical "hoy" como divisor visual
- **4 KPIs laterales:** vs Mes Anterior · vs YoY · Tendencia 8 sem · Precisión MAPE
- **SubKpis:** 4 cards — Mes actual / Mes anterior / Año anterior / Pronóstico (última con `border-foreground/30` para destacar)
- **Tabla top 15 SKUs:** 30d real · mes anterior · año anterior · ΔMoM · ΔYoY · pronóstico 30d · sparkline 8sem

**Algoritmo del forecast:**
```
forecast_diario = baseline_28d × seasonality_yoy × trend_factor

donde:
  baseline_28d        = avg(revenue/day, últimos 28 días)
  seasonality_yoy     = ventas_mismos_30d_año_pasado / ventas_30d_previos_año_pasado
  trend_factor        = 1 + (slope_8w_pct / 100) × 0.5   ← dampened al 50%
  slope_8w_pct        = pendiente lineal mínimos cuadrados / avg_weekly × 100

MAPE backtest:
  comparar baseline(días -58 a -31) × 30 × seasonality × trend
  vs real(últimos 30d). Reportar Precisión = 100 - MAPE.
```

**Decisiones del algoritmo:**
- **Dampening 0.5 al trend**: si las últimas 8 semanas creció +20%/sem, NO extrapolar 20% a futuro (sería ridículo) — solo 10%. Trend muy reciente es ruidoso.
- **Seasonality YoY como ratio, no como diff**: capta multiplicador de mes alto vs mes bajo del año pasado.
- **Por SKU**: cada uno tiene su propio seasonality, slope y forecast. La tabla muestra los 15 con más venta reciente, ignora SKUs con 0 ventas en 30d.
- **MAPE backtest simple**: usamos baseline anclado en (-58, -31) y comparamos con real (-29, 0). No es un cross-validation completo pero es honesto y rápido.

**Datos requeridos:**
- `sales` con histórico de ~420 días (14 meses) para tener YoY confiable. La org demo tiene desde 2024-09 → suficiente.
- `products.unit_price` para convertir unidades pronosticadas a revenue.

### Decisiones clave — sesión 2026-05-13/14

1. **Chips con contador como patrón estándar de filtros** — sustituye Selects con emoji. El KAM ve `Riesgo · 12` antes de clicar; chips con count=0 se ocultan automáticamente. Aplicado en /sugeridos (razones), /tiendas (status), /productos (status), /oc (status).
2. **Cada KPI debe responder a "¿qué hago con esto?"** — eliminados KPIs decorativos ("SKUs activos", "Tiendas activas", "OCs activas") en favor de accionables (Margen, Concentración top 5, OCs sub-surtidas, Tiendas en riesgo).
3. **Tone semántico es señal, no estética** — danger/warning/success aplicado por umbral en TODOS los KPIs nuevos, no decorativo.
4. **Hero numbers con delta inline** — siempre mostrar % vs periodo comparable cuando hay histórico. Patrón: `$X grande · +Y% vs Z` con badge emerald/rose.
5. **Lost Sale Ledger justifica el SaaS** — el KAM puede mostrar a su jefe "$284k de venta perdida YTD por sugeridos no cumplidos" → compara contra costo de la plataforma para justificar contratarla/mantenerla.
6. **Forecast simple > Prophet** — no instalamos sklearn/Prophet. Baseline 28d × seasonality YoY × trend dampened es defendible, rápido en SQL/JS, y la precisión (MAPE) se reporta honestamente. Si MAPE sale mal en producción, ese mismo dato es contenido de venta ("nuestra precisión es 92%" si sale bien).
7. **`ComposedChart` para 3 series en mismo eje** — Recharts soporta mezclar `Area` + `Line` + `ReferenceLine`. Es la pieza visual que clona Celes ("Real vs Pronóstico con precisión 96.2%").
8. **No tocamos `service_role` ni saltamos RLS** — toda la query nueva usa `supabaseServer()` con sesión. La capa de tipos garantiza que cada `loadForecast()` pase por `verifySession()`.
9. **Dampening al trend = 0.5 fijo (hardcoded)** — futuro: hacerlo configurable por org si vemos drift. Por ahora 0.5 funciona bien con la data demo.
10. **Backend extendido sin tablas nuevas** — toda la sesión se hizo solo extendiendo queries existentes y agregando 2 queries nuevas (`lost-sale-ledger.ts`, `forecast.ts`). Cero migraciones SQL. Schema canónico intacto.

### Pendientes / mejoras detectadas para siguiente sesión

- **Sortable columns en tablas** — sigue pendiente del roadmap visual.
- **Drawer/Sheet de detalle en `/sugeridos`** — click fila → side panel con histórico inventario+ventas 4 sem + OCs recientes. La pieza shadcn `Sheet` ya está instalada.
- **Toggle agrupar /sugeridos por Producto** (consolidado tipo Celes) — "Total a pedir de Papa 45g: 1,840 un en 12 tiendas".
- **Heatmap tienda × SKU** (killer feature 1.5) — vista nueva `/cobertura` con grid coloreado por DDI.
- **Phantom stockouts detector** (killer feature 2.2) — alerta cuando hay inventario sistémico > 0 pero 0 ventas N días.
- **Detector OC sub-óptima** (killer feature 2.6) — comparar OC recibida vs `suggested_orders.suggested_units` del mismo periodo, alertar gap > 50%.
- **Lead time real por tienda** (killer feature 2.1) — hoy sólo tenemos lead time global; debería ser por (store, chain) con p90 para planeación conservadora.
- **Validar forecast con datos reales** — hoy corre sobre mock. Cuando entre Delikos real, validar que MAPE da números creíbles. Si MAPE > 30% en algún SKU, revelar warning inline.
- **Export CSV en `/forecast`** — sería útil que Mario exporte el forecast 30d a Excel para compartir con su jefe.
- **Tour visual** (post-polish) — onboarding interactivo de las vistas para nuevos clientes que entren al portal.

### Estado al cerrar sesión

- **Producción:** `app-rushdata.vercel.app` desplegado con commit `24f0b10` (Vercel build en curso al momento del cierre).
- **8 rutas activas:** `/`, `/sugeridos`, `/forecast` (NUEVA), `/tiendas`, `/tiendas/[id]`, `/productos`, `/productos/[id]`, `/oc`.
- **Build local limpio**: `npm run build` exit 0, todas las páginas SSR-friendly.
- **Typecheck limpio** en todos los pasos intermedios.
- **No se tocó SQL** — solo capa frontend + queries TS.

---

## Sesión 2026-05-14 — Paridad MatchData: 8 features Tier 1+2+3

**Disparador:** análisis competitivo identificó a **MatchData** (Mexicano, CDMX+MTY, 2-10 personas, 2016) como el competidor más cercano. Cubren 13 cadenas (Coppel, Soriana, Walmart, HEB, Sears, Sanborns, Liverpool, Sam's, City Club, Costco, Comerci, Farmacias Benavides, Alsuper) — modelo de servicio: descargan portales, homologan, entregan Excel + reportes ad-hoc. **No tienen webapp moderna, no tienen sugeridos accionables, no tienen forecast con MAPE, no tienen lost sale ledger.** Pero su moat es la cobertura de cadenas + relación con KAMs MX que se construyó en 10 años.

**Decisión estratégica:** no competir en cobertura de cadenas (RushData solo HEB hoy). Competir en **profundidad accionable** y **paridad funcional en data básica**. Mario identificó el gap MatchData→RushData: detalle SKU por tienda, reportes semanales/mensuales/anuales, KPIs ventas/precios/forecast/min-max/sell-in-out, resúmenes ejecutivos con tendencias, 5 años de histórico, reportes ad-hoc custom. Se omitió ARTI (promotoría — RushData no hace ejecución en piso).

**Resultado:** 8 features divididas en 3 tiers, **todas completadas en una sesión**, 8 commits, ~3,600 líneas de código, deployed.

### Tier 1 — paridad funcional con MatchData

#### F1 · Selector de período dual (commits `bb5c6ad` + `050b59b`)

**Qué cierra el gap:** "reportes semanales/mensuales/anuales" de MatchData. Hasta esta sesión solo había rolling 7d/30d/90d.

**Backend:** ningún cambio SQL en esta feature (el calendario fiscal HEB ya vivía en `chain_calendars` desde Fase 1).

**Frontend nuevo:**
- `web/src/lib/period.ts` (server-only) — resolver de períodos con 3 modos:
  - **Rolling**: `7d` / `30d` / `90d`
  - **Calendario**: `cal:YYYY-MM` / `cal:YYYY` / `cal:ytd`
  - **Fiscal HEB**: `fis:P##-YYYY` / `fis:YYYY` / `fis:ytd`
  - Funciones expuestas: `loadFiscalPeriods(chainSlug)`, `resolvePeriod(raw, fiscalPeriods)`, `buildPeriodOptions(fiscalPeriods)`
  - Devuelve `ResolvedPeriod = { raw, mode, start, end, days, label, shortLabel }`
- `web/src/components/shared/PeriodSelector.tsx` (client) — dropdown con 3 columnas; la columna fiscal se oculta cuando la cadena no tiene calendario fiscal. Props `includeAll` + `defaultValue` para variantes (ej. /oc).
- `web/src/lib/queries/home-timeseries.ts` — refactor de `(days: number)` a `(startIso, endIso)`. Las queries que reciban ventanas dinámicas deben migrar a este patrón.
- `web/src/app/page.tsx` + `web/src/components/home/HomeFilters.tsx` — Home consume el nuevo helper.
- `web/src/app/oc/page.tsx` + `web/src/components/oc/OCFilters.tsx` — `/oc` también; default "all" + soporte para "Todo el histórico" vía `includeAll`.
- `web/src/lib/queries/po.ts` — `loadPOOverview` migrado de `periodDays` a `periodStart`/`periodEnd`.

**Cómo viaja un click del KAM:**
1. Click en chip "Mayo 2026" → `PeriodSelector.update("cal:2026-05")`
2. `router.push("/?period=cal:2026-05")` con `startTransition` → opacity-60 mientras navega
3. Server: `page.tsx` recibe `searchParams.period` → llama `resolvePeriod("cal:2026-05", fiscalPeriods)`
4. Helper devuelve `{ start: "2026-05-01", end: "2026-05-14" (hoy), label: "Mayo 2026", ... }`
5. `loadHomeTimeSeries(period.start, period.end)` → query Supabase con `gte/lte sale_date`
6. RSC re-render

#### F2 · Vista `/cobertura` (commit `8a275c0`)

**Qué cierra el gap:** "detalle SKU por tienda" de MatchData. Hasta ahora teníamos drill-down (producto→tiendas y tienda→productos) pero no vista global cruzada. Es el patrón que un KAM consulta primero.

**Backend:**
- Reusa la vista existente `vw_inventory_with_velocity` (definida en `sql/02_views.sql` desde Fase 3) — join de `vw_latest_inventory` con `vw_velocity_28d` y `vw_velocity_7d`. Devuelve por (org_id, store_id, product_id): `current_inventory`, `velocity_daily`, `velocity_7d`, `days_of_inventory`.
- No requirió SQL nuevo.

**Frontend nuevo:**
- `web/src/lib/queries/coverage.ts` — `loadCoverageMatrix()` hace 3 queries paralelas (stores activos, products activos, vw_inventory_with_velocity) y une todo en memoria. Devuelve `{ stores, products, cells, clusters, regions, categories, totals }`. Cell = `{ storeId, productId, inventory, velocity, ddi, hasStockout }`.
- `web/src/components/cobertura/CoverageMatrix.tsx` (client) — heatmap denso con 4 métricas intercambiables (DDI / Inventario / Velocidad / Quiebres). Sticky headers (tiendas rotadas 60°) + sticky first column. Filtros cliente-side: categoría / cluster / región / hide CEDIS. Tooltip al hover.
- `web/src/app/cobertura/page.tsx` — KPI strip (tiendas, SKUs, % cobertura, celdas quiebre) + matriz.
- `web/src/app/cobertura/loading.tsx`
- Item en `AppSidebar.tsx` grupo **Catálogo**, icono `Grid3x3`.

**Cómo viaja un cambio de métrica:**
- TODO el filtrado es client-side. No re-fetch. El payload del server (~1500 cells × 70 bytes ≈ 100KB) es chico y se filtra/recalcula en `useMemo`. Esto es deliberado para zero-latency switching entre métricas.

#### F3 · Export CSV global (commit `bcf179c`)

**Qué cierra el gap:** "reportes ad-hoc custom" de MatchData (parcialmente). Cualquier KAM puede llevarse cualquier tabla a Excel.

**Backend:** ningún cambio.

**Frontend nuevo:**
- `web/src/lib/csv.ts` — `rowsToCsv(rows, columns)` con escape correcto (`"` → `""`, comillas alrededor de cualquier valor con `,`/`"`/CR/LF/`;`). `downloadCsv(filename, body)` agrega BOM UTF-8 `﻿` para que Excel español detecte acentos. `todayStamp()` para sufijo de fecha.
- `web/src/components/shared/CsvExportButton.tsx` — `<CsvExportButton rows={array|thunk} columns={...} filename="...">`. Acepta thunk para lazy-eval (vistas con filtros cliente como /cobertura).
- Integrado en 6 vistas:
  - `/sugeridos` (SugeridosTable) — reemplaza el export ad-hoc que ya tenía (escape débil). Exporta seleccionados o todos los filtrados.
  - `/productos` (ProductosTable) — CardHeader nuevo con botón.
  - `/tiendas` (TiendasTable) — CardHeader nuevo con botón.
  - `/oc` (OCRecentTable) — botón en el CardHeader existente.
  - `/forecast` (ForecastTable) — top SKUs con MoM, YoY, pronóstico.
  - `/cobertura` (CoverageMatrix) — matriz larga (1 fila por cell no-vacía).

#### F4 · Histórico multi-año (commit `d6e215d`)

**Qué cierra el gap:** "5 años de histórico" de MatchData. Esto es el refactor más profundo de la sesión porque toca SQL.

**Backend SQL — NUEVO:**

Las funciones `fn_product_kpis`, `fn_store_kpis`, `fn_product_weekly_sales` vivían solo en Supabase (no en el repo). Esta sesión las versionó y refactorizó:

- `sql/04_kpi_functions.sql` — **snapshot del estado pre-F4** (para reproducibilidad). 6 funciones: `fn_po_monthly`, `fn_po_top_products`, `fn_po_top_stores`, `fn_product_kpis` (versión vieja con `units_last_30d`), `fn_product_weekly_sales`, `fn_store_kpis` (vieja).
- `sql/05_kpi_functions_ranged.sql` — **el cambio real**. Hace `DROP FUNCTION` + `CREATE` de las dos KPI principales con signatura nueva:
  ```sql
  fn_product_kpis(p_org_id uuid, p_start date DEFAULT NULL, p_end date DEFAULT NULL)
    RETURNS TABLE (
      product_id uuid,
      stores_with_inventory int,    -- siempre "ahora" (snapshot)
      stores_with_stockout int,     -- siempre "ahora"
      inventory_units numeric,       -- siempre "ahora"
      units_in_window numeric,       -- NUEVO: respeta ventana
      revenue_in_window numeric      -- NUEVO: respeta ventana
    )
  ```
  Lógica interna:
  - Si `p_start`/`p_end` son NULL → default = últimos 30d desde `max(sale_date)` (compat 100% con código viejo)
  - Si vienen ambos → las ventanas de ventas (`units_in_window`, `revenue_in_window`) filtran por `sale_date BETWEEN p_start AND p_end`
  - Las métricas de estado (inventario, stockouts) SIEMPRE son "ahora" — son snapshot, no histórico. Esta es una decisión de modelado: para hacer "stockouts en abril 2024" necesitaríamos snapshots históricos de stockouts (no existen en BD).
  
  Idéntico para `fn_store_kpis(p_org_id, p_start, p_end)` y `fn_product_weekly_sales(p_org_id, p_weeks, p_end)`.

**Frontend nuevo:**
- `web/src/lib/queries/products.ts` — `loadProducts({ start?, end? })` ahora acepta rango opcional. Mapea `units_in_window` → `units30d`, `revenue_in_window` → `revenue30d` (el nombre del campo TS se mantiene para no romper consumidores).
- `web/src/lib/queries/stores.ts` — mismo patrón.
- `web/src/lib/queries/forecast.ts` — nuevo opt `historyDays`. El fetch carga `max(420d, historyDays + 30d)` para mantener YoY funcional.
- `web/src/app/productos/page.tsx` — `<PeriodSelector>` en header. Subtitle muestra "ventas en {período}".
- `web/src/app/tiendas/page.tsx` — mismo patrón.
- `web/src/app/forecast/page.tsx` + `web/src/components/forecast/HorizonSelector.tsx` — selector específico (90d / 1y / 2y / 5y). NO el dual porque las ventanas comparativas YoY/MoM de forecast están ancladas a "hoy"; solo cambia cuánto histórico se muestra en el chart.

**Aplicación del SQL en Supabase:** Mario aplicó `05_kpi_functions_ranged.sql` vía SQL Editor. Verificación posterior vía MCP (después de OAuth) — funciones quedaron con signatura correcta. Smoke test con Abril 2026: top SKU vendió 1,290 un / $476,010 — coherente.

### Tier 2 — diferenciadores sobre MatchData

#### F5 · Reporte ejecutivo PDF (commit `add97b4`)

**Qué cierra el gap:** "resúmenes ejecutivos con tendencias" de MatchData (que entrega Excel/PDF por email semanal). RushData lo genera on-demand desde el browser.

**Estrategia técnica:** **CSS `@media print` + `window.print()`** — el browser hace toda la conversión a PDF via "Guardar como PDF" nativo. **Cero dependencias** (puppeteer/jsPDF descartados por peso en bundle y complejidad de deploy en Vercel).

**Backend:** ningún cambio. Reusa `loadHomeData`, `loadHomeStats`, `loadLostSaleLedger`.

**Frontend nuevo:**
- `web/src/app/reporte/page.tsx` — vista print-friendly con header (marca + org + fecha + generado por), resumen ejecutivo (4 KPIs: quiebres, $ riesgo, sugeridos, fill rate), primer movimiento del día, top 10 sugeridos, alertas recientes, estado del catálogo (6 stats), lost sale ledger YTD, footer (fecha + hora).
- `web/src/app/reporte/layout.tsx` — wrapper que rompe los paddings del root layout (`-mx-6 -my-6 lg:-mx-8 lg:-my-8`) para que el reporte ocupe ancho completo. En print modo, vuelve a 0.
- `web/src/components/reporte/PrintActions.tsx` (client) — barra superior con "Volver" y "Imprimir/PDF". Si la URL es `?print=1`, dispara `window.print()` automático tras 350ms (suficiente para que React termine de hidratar).
- `web/src/app/globals.css` — `@media print` block: `@page { size: A4; margin: 12mm 14mm }`. Oculta `[data-slot="sidebar-wrapper"]`, `[data-slot="sidebar"]`, `header[data-slot="topbar"]`, `.app-topbar`. Resetea paddings de `<main>` y `[data-slot="sidebar-inset"]`. `body` con `background: white !important`. `.break-inside-avoid` para evitar partir secciones.
- `web/src/components/home/HomeHeader.tsx` — botón "Reporte PDF" en HomeHeader (reemplaza el viejo "Exportar sugeridos" que duplicaba el CSV de /sugeridos).

#### F6 · Vista `/flow` — sell-in vs sell-out (commit `ea4ddec`)

**Qué cierra el gap:** "KPIs sell-in/sell-out" de MatchData. Diferenciador clave: RushData incluye **insight automático** sobre el gap acumulado (cadena acumulando inventario / vaciándose / equilibrado).

**Backend:** ningún cambio. Reusa `sales` (sell-out) + `purchase_orders` (sell-in).
- Sell-in proxy: `total_units_received` de OCs `WHERE status IN ('fulfilled', 'partial')`, agrupado por `order_date` (no hay `received_date` en BD). Revenue prorateado por `% recibido`.
- Sell-out: `units` + `revenue_no_tax` de `sales`.

**Frontend nuevo:**
- `web/src/lib/queries/flow.ts` — `loadFlow({ start?, end? })` hace 2 queries paralelas (sales + POs), agrega por mes en memoria. Calcula `netUnits` mensual + `cumulativeNetUnits` (gap acumulado = stock teórico en cadena). Devuelve totals con `sellThroughPct = sellOutUnits / sellInUnits`.
- `web/src/components/flow/FlowChart.tsx` — `ComposedChart` con 2 ejes: barras dobles (sell-in sky + sell-out emerald) en eje izquierdo + área del gap acumulado en eje derecho. `ReferenceLine` horizontal en y=0 del eje derecho.
- `web/src/app/flow/page.tsx` — KPI strip (sell-in total, sell-out total, sell-through %, inventario en cadena) + **insight automático** (gap trend últimos 3 meses → si crece >1000 un → warning "overstock"; si decrece <-1000 → danger "vaciándose"; si está en medio → success "equilibrado") + chart + tabla mensual con neto y acumulado.
- Item en `AppSidebar.tsx` grupo **Principal**, icono `ArrowLeftRight`.

#### F7 · ASP (precio promedio) en `/productos` (commit `6e5e1e4`)

**Qué cierra el gap:** "KPIs de precios promedio" de MatchData. Diferenciador: detección automática de **promociones agresivas** (caída WoW de ASP) que puede ser canibalización.

**Backend:** ningún cambio. Aprovecha las nuevas columnas `units_in_window`/`revenue_in_window` de F4.

**Frontend nuevo:**
- `web/src/lib/queries/products.ts` — `ProductRow` agrega `asp` (= `revenue_in_window / units_in_window`) y `aspDeltaPct` (% WoW de la última vs penúltima semana de `fn_product_weekly_sales`).
- `web/src/components/productos/ProductosTable.tsx` — nueva columna "ASP" + componente `<AspCell>` que muestra el valor + flag rojo cuando:
  - ASP cae >2% WoW (señal de promo activa / canibalización)
  - ASP está >5% por debajo de `unit_price` de lista (descuento sostenido)
- Saca columna "UPC" de la tabla visible (sigue en CSV) para hacer espacio. Export CSV agrega `ASP MXN` + `ASP delta %WoW`.

### Tier 3 — feature ambiciosa para cerrar la lista MatchData

#### F8 · `/reportes` — Pivot builder ad-hoc (commit `b9b7f70`)

**Qué cierra el gap:** "reportes ad-hoc custom" de MatchData (el use case completo, no solo CSV). MatchData lo resuelve con consultoría humana; RushData lo resuelve con UI.

**Backend:** ningún cambio. Hace queries directas a `sales`, `products`, `stores`, `vw_latest_inventory`.

**Frontend nuevo:**
- `web/src/lib/queries/reports.ts` — `loadReports({ start, end, categoryFilter, clusterFilter, regionFilter })` devuelve **facts normalizados** a granularidad (productId × storeId × month) con `units`, `revenue`, `currentInventory`. Excluye CEDIS. Devuelve también listas únicas de categorías/clusters/regiones para los filtros.
- `web/src/components/reportes/PivotBuilder.tsx` (client) — UI con:
  - **Dimensión** (groupBy): producto / tienda / categoría / cluster / región / mes
  - **Métricas toggleables**: unidades / revenue / ASP / inventario
  - **Sort by**: cualquier métrica activa
  - Tabla con footer de totales
  - Export CSV directo del agrupado actual
  - Toda la agregación en `useMemo` client-side — re-pivot instantáneo
- `web/src/components/reportes/ReportesFilters.tsx` (client) — filtros globales de categoría/cluster/región vía URL params.
- `web/src/app/reportes/page.tsx` — shell con `<PeriodSelector>` dual + filtros + builder.
- `web/src/app/reportes/loading.tsx`
- Item en `AppSidebar.tsx` grupo **Catálogo**, icono `TableProperties`.

**Decisión consciente — alcance reducido vs Tableau:**
- Solo **una dimensión** de agrupación, no row×col pivot. El cruce 2D se deja para iteración futura.
- Las facts vienen pre-agregadas a mes (no día) para mantener el payload <5k filas.

### Arquitectura técnica completa

Documentada por separado al final de este HISTORY.md en la sección **"Arquitectura técnica · Supabase ↔ Frontend"**.

### Decisiones clave — sesión 2026-05-14

1. **No competir en cobertura de cadenas con MatchData** — competir en profundidad y UX KAM-first. La ventaja de MatchData (13 cadenas) toma 10 años de replicar; nuestra ventaja (motor accionable + UX) toma 18 meses para que ellos repliquen.
2. **CSS print > librería PDF** — `@media print` + `window.print()` da render perfecto, cero dependencias, funciona en cualquier OS. Puppeteer/jsPDF descartados por peso y complejidad de deploy.
3. **Funciones SQL deben estar en el repo** — gap descubierto: `fn_product_kpis`, `fn_store_kpis` y otras vivían solo en Supabase. Las versionamos en `sql/04_*.sql` antes de refactorizar. **Regla nueva**: cualquier función nueva debe quedar en `sql/` antes de aplicarse en BD.
4. **`fn_*_kpis(p_org_id, p_start, p_end)` con params opcionales** — compat 100% con callers viejos (NULL → últimos 30d desde max(sale_date)). Las nuevas llamadas pasan rango explícito. Esto permitirá Feature futura "Reportes anuales históricos" sin re-refactor.
5. **Métricas de estado siempre "ahora", métricas de ventas respetan ventana** — decisión de modelado: para tener "stockouts en abril 2024" necesitaríamos historial de snapshots de stockouts que no existe. Hacer "actual + ventana de ventas" es honesto y útil. La nota está en cada vista que muestra ambos tipos juntos.
6. **`/cobertura` con 4 métricas client-side, no 4 vistas server** — payload de la matriz es ~100KB, switching de métrica es instantáneo. Mejor UX que server-side roundtrip.
7. **`/flow` con insight automático** — diferenciador real vs MatchData: no solo dar el dato, dar la lectura. "Tu cadena está acumulando inventario" es lo que un consultor diría — la app lo hace solo.
8. **Pivot builder simplificado (groupBy único, no row×col)** — 80% del valor con 30% de la complejidad. El cruce 2D real puede esperar a clientes reales pidiéndolo.
9. **MCP Supabase usado para verificar SQL** — autenticación OAuth completada mid-sesión; permitió validar funciones recién aplicadas + ejecutar smoke tests directamente. Para sesiones futuras: el MCP debe usarse para verificar antes de pushear código que dependa de cambios SQL.
10. **`asp` y `aspDeltaPct` derivados en TS, no en SQL** — los datos crudos (`units_in_window`, `revenue_in_window`, weekly series) ya están. Derivar en TS evita tener que cambiar `fn_*` y permite que el frontend itere flag thresholds (>5% descuento, >2% WoW drop) sin migración SQL.

### Pendientes / mejoras detectadas para siguiente sesión

- **`/forecast` con selector dual completo** — hoy solo tiene `<HorizonSelector>` (90d/1y/2y/5y). Para hacer "forecast del mes pasado" o "forecast del mismo período año anterior" requiere refactor del modelo comparativo MoM/YoY relativos a período (no a hoy).
- **Cruce 2D en `/reportes`** — row×col pivot. Hoy solo dimensión única.
- **`fn_*_kpis` aceptando store_id / product_id filter** — para reportes filtrados sin tener que cargar todo el universo y filtrar en TS.
- **Histórico real de stockouts** — para que F4 también afecte "stockouts en período X". Requiere snapshot diario de `stockout_alerts` en una nueva tabla (`stockout_history`).
- **Cobertura: ordenar tiendas/productos por métrica** — hoy van por nombre alfabético. Cluster + criticidad podría ser más útil.
- **Sortable columns en tablas** — sigue pendiente del roadmap anterior.
- **Sheet/Drawer de detalle en `/sugeridos`** — sigue pendiente.
- **Phantom stockouts detector** — sigue pendiente del roadmap killer features.
- **Lead time real por tienda** — sigue pendiente.

### Archivos nuevos creados

```
sql/
├── 04_kpi_functions.sql          ← snapshot pre-F4
└── 05_kpi_functions_ranged.sql   ← refactor con params

web/src/
├── lib/
│   ├── period.ts                 ← resolver de períodos (F1)
│   ├── csv.ts                    ← helper CSV (F3)
│   └── queries/
│       ├── coverage.ts           ← (F2)
│       ├── flow.ts               ← (F6)
│       └── reports.ts            ← (F8)
├── components/
│   ├── shared/
│   │   ├── PeriodSelector.tsx    ← (F1)
│   │   └── CsvExportButton.tsx   ← (F3)
│   ├── cobertura/
│   │   └── CoverageMatrix.tsx    ← (F2)
│   ├── forecast/
│   │   └── HorizonSelector.tsx   ← (F4)
│   ├── flow/
│   │   └── FlowChart.tsx         ← (F6)
│   ├── reporte/
│   │   └── PrintActions.tsx      ← (F5)
│   └── reportes/
│       ├── PivotBuilder.tsx      ← (F8)
│       └── ReportesFilters.tsx   ← (F8)
└── app/
    ├── cobertura/                ← (F2)
    ├── flow/                     ← (F6)
    ├── reporte/                  ← (F5)
    └── reportes/                 ← (F8)
```

### Archivos modificados

- `web/src/app/page.tsx` + `web/src/components/home/HomeHeader.tsx` + `web/src/components/home/HomeFilters.tsx` (F1 + F5)
- `web/src/app/oc/page.tsx` + `web/src/components/oc/OCFilters.tsx` + `web/src/components/oc/OCRecentTable.tsx` (F1 + F3)
- `web/src/app/forecast/page.tsx` + `web/src/components/forecast/ForecastTable.tsx` (F3 + F4)
- `web/src/app/productos/page.tsx` + `web/src/components/productos/ProductosTable.tsx` (F3 + F4 + F7)
- `web/src/app/tiendas/page.tsx` + `web/src/components/tiendas/TiendasTable.tsx` (F3 + F4)
- `web/src/components/sugeridos/SugeridosTable.tsx` (F3)
- `web/src/lib/queries/po.ts` + `web/src/lib/queries/home-timeseries.ts` (F1)
- `web/src/lib/queries/products.ts` + `web/src/lib/queries/stores.ts` + `web/src/lib/queries/forecast.ts` (F4)
- `web/src/components/layout/AppSidebar.tsx` — agregó items "Sell-in / out", "Cobertura", "Reportes"
- `web/src/app/globals.css` — `@media print` styles
- `docs/FRONTEND.md` — documentación de patrones nuevos

### Estado al cerrar sesión

- **Producción:** `app-rushdata.vercel.app` desplegado con commit `b9b7f70`. Vercel re-deployed 8 veces durante la sesión, todos exitosos.
- **13 rutas activas:** `/`, `/sugeridos`, `/forecast`, `/flow` (NUEVA), `/oc`, `/tiendas`, `/tiendas/[id]`, `/productos`, `/productos/[id]`, `/cobertura` (NUEVA), `/reportes` (NUEVA), `/reporte` (NUEVA, no en sidebar).
- **Build local limpio en cada commit**: `next build` exit 0, TypeScript ok.
- **SQL aplicado en Supabase**: `sql/05_kpi_functions_ranged.sql` corrido vía SQL Editor por Mario; verificado posteriormente vía MCP. Función vieja `fn_product_weekly_sales(uuid, integer)` dropeada (overload duplicado).
- **Comparativo final vs MatchData**:

| Feature MatchData | RushData (hoy) |
|---|---|
| Detalle SKU por tienda | ✅ `/cobertura` global + tabs en /productos/[id] y /tiendas/[id] |
| Reportes semanales/mensuales/anuales | ✅ Selector dual en /, /oc, /productos, /tiendas, /reportes |
| KPIs: ventas, precios, forecast, sell-in/sell-out | ✅ Cubierto + ASP + insight automático en /flow |
| Resúmenes ejecutivos con tendencias | ✅ `/reporte` PDF print-friendly |
| 5 años de histórico | ✅ Selector hasta 5y en /forecast, ventana arbitraria en /productos, /tiendas |
| Reportes ad-hoc custom | ✅ `/reportes` pivot builder + CSV global |
| 13 cadenas soportadas | 🟡 Solo HEB todavía. **NO PRIORIDAD para esta sesión.** |
| ARTI (promotoría) | ❌ Por decisión, RushData NO hace ejecución en piso |

---

## Arquitectura técnica · Supabase ↔ Frontend (snapshot 2026-05-14)

> **Esta sección documenta la arquitectura completa del backend Supabase y cómo cada función/vista/tabla está conectada con queries TypeScript y componentes del frontend.** Es la fuente de verdad para cualquier desarrollo futuro.

### Visión global — capas

```
┌─────────────────────────────────────────────────────────────────┐
│  CLIENTE BROWSER (React 19 + Recharts + lucide-react)           │
│  ────────────────────────────────────────────────────────────   │
│  • Server Components (RSC) renderean HTML inicial               │
│  • Client Components ("use client") — solo filtros, charts,     │
│    forms. URL state vía useSearchParams                          │
└────────────────────┬────────────────────────────────────────────┘
                     │ HTTP (HTML + RSC payload)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  NEXT.JS 16 (App Router) — server                                │
│  ────────────────────────────────────────────────────────────   │
│  • web/src/app/**/page.tsx — Server Components                  │
│  • Llaman queries en web/src/lib/queries/*.ts                    │
│  • lib/dal.ts → verifySession() / getSessionSoft() memoizadas    │
│  • lib/supabase/ssr.ts → supabaseServer() con cookies async      │
│  • proxy.ts en root: protege rutas + refresca tokens             │
└────────────────────┬────────────────────────────────────────────┘
                     │ supabase-js (con JWT del user)
                     ▼
┌─────────────────────────────────────────────────────────────────┐
│  SUPABASE                                                        │
│  ────────────────────────────────────────────────────────────   │
│  AUTH (GoTrue):                                                  │
│  • auth.users + auth.identities                                  │
│  • Magic link OTP                                                │
│  • app_metadata.org_id + app_metadata.role en el JWT             │
│                                                                  │
│  POSTGRES:                                                       │
│  • RLS habilitado en TODAS las tablas con org_id                 │
│  • auth_org_id() lee del JWT (con fallback a public.users)       │
│  • Política: USING (org_id = auth_org_id())                      │
│  • Trigger trg_sync_user_org_to_jwt mantiene JWT actualizado     │
│                                                                  │
│  CAPA DE DATOS:                                                  │
│  ─ Tablas base (Capa 1-3): organizations, users, chains,         │
│    chain_calendars, org_chain_access, products,                  │
│    product_packaging, stores                                     │
│  ─ Tablas transaccionales (Capa 4):                              │
│    inventory_snapshots, sales, purchase_orders,                  │
│    purchase_order_lines                                          │
│  ─ Tablas derivadas (Capa 5):                                    │
│    suggested_orders, stockout_alerts, daily_kpis,                │
│    ingestion_runs                                                │
│                                                                  │
│  VISTAS (sql/02_views.sql):                                      │
│  ─ vw_latest_inventory       — inventario más reciente           │
│  ─ vw_velocity_28d           — velocidad 28 días                 │
│  ─ vw_velocity_7d            — velocidad 7 días                  │
│  ─ vw_active_pos_pending     — OCs en tránsito                   │
│  ─ vw_inventory_with_velocity — join completo                    │
│  ─ vw_active_stockouts       — combinaciones en quiebre          │
│                                                                  │
│  FUNCIONES SQL:                                                  │
│  ─ Motor de sugeridos (sql/03_functions.sql):                   │
│    • fn_cover_target_days, fn_compute_stockouts,                 │
│      fn_compute_suggestions, fn_compute_daily_kpis,              │
│      fn_run_engine                                               │
│  ─ KPI queries (sql/04 + 05):                                    │
│    • fn_product_kpis(uuid, date, date)                           │
│    • fn_store_kpis(uuid, date, date)                             │
│    • fn_product_weekly_sales(uuid, int, date)                    │
│    • fn_po_monthly, fn_po_top_products, fn_po_top_stores         │
│  ─ Auth helper (sql/00 + 06):                                    │
│    • auth_org_id, admin_create_user                              │
└─────────────────────────────────────────────────────────────────┘
```

### Sesión y RLS — el flujo de autorización en cada query

**Todo cliente Supabase usado en queries server-side de Next.js usa el JWT del user.** Esto significa:

1. El user inicia sesión con magic link → `auth.users` se crea/actualiza
2. El trigger `trg_sync_user_org_to_jwt` copia `org_id` + `role` de `public.users` al `raw_app_meta_data` de `auth.users`
3. GoTrue emite JWT con `app_metadata.org_id` embebido
4. Browser guarda cookie de sesión (manejada por `@supabase/ssr`)
5. En cada navegación, `lib/supabase/ssr.ts → supabaseServer()` lee la cookie con `cookies()` (async en Next 16) y crea un cliente Postgres autenticado
6. Cualquier query `db.from("...").select()` lleva el JWT como header
7. Postgres evalúa el RLS: `auth_org_id()` extrae `org_id` del JWT, filtra a "solo filas con org_id = ese valor"
8. **El user nunca ve datos de otra org.** Sin importar qué query haga el frontend.

**Implicación importante:** las queries TS NO necesitan agregar `WHERE org_id = ...` manualmente. RLS lo hace. Sin embargo, las queries reales sí lo agregan explícitamente (`db.from("...").eq("org_id", orgId)`) **por defensa en profundidad** — si el RLS se desactivara por error, las queries siguen filtrando.

**Excepción: ingesta.** Los scripts Python en `ingest/` usan `service_role` (bypassa RLS) porque cargan datos de múltiples orgs. Pasan `org_id` explícitamente.

### Mapa función-por-función · cómo cada feature conecta con Supabase

#### Home (`/`)

**Page:** `web/src/app/page.tsx`

**Llama 5 queries en paralelo via `Promise.all`:**

| Query TS | Archivo | Toca en Supabase | Detalle |
|---|---|---|---|
| `verifySession()` | `lib/dal.ts` | `auth.getUser()` + `public.users JOIN organizations` | Memoizada con `React.cache()`. Devuelve `{userId, email, orgId, orgSlug, orgName, role}`. |
| `loadHomeData()` | `lib/queries/home.ts` | `daily_kpis` + `suggested_orders` + `stockout_alerts` (4 sub-queries paralelas) | Devuelve `{kpi, suggestedCount, suggestedValue, topSuggestions, alerts}`. KPI snapshot del día más reciente. |
| `loadHomeTimeSeries(start, end)` | `lib/queries/home-timeseries.ts` | `sales` + `stockout_alerts` filtrados por `sale_date BETWEEN start AND end` | Devuelve serie diaria `[{date, capturedSale, lostSale}]`. **Acepta rango desde F1.** |
| `loadHomeStats()` | `lib/queries/home-stats.ts` | `vw_latest_inventory` + `vw_active_stockouts` + agregados de `sales` | Stats de cobertura, DDI promedio, semanas de inventario. |
| `loadLostSaleLedger()` | `lib/queries/lost-sale-ledger.ts` | `stockout_alerts` agrupado por mes | YTD + mes pasado + mes previo + serie 12 meses. |

**URL params:**
- `?period=` → resuelve a ventana `{start, end}` con `lib/period.ts:resolvePeriod`
- `?chain=` → seleciona cadena (hoy solo HEB activa)
- `?cur=` → MXN/USD (cosmético; revenue siempre en MXN)

**Botón "Reporte PDF"** en HomeHeader → linkea a `/reporte`.

#### Sugeridos (`/sugeridos`)

**Page:** `web/src/app/sugeridos/page.tsx`

**Query principal:** `loadSuggestions({reason, onlyCritical, cluster, search})`
- Archivo: `lib/queries/suggestions.ts`
- Toca: `suggested_orders` con join `stores(name, cluster)` + `products(name, category)`
- Filtros server-side: `WHERE org_id = ? AND status = 'new'` + opcional `reason_code` y `current_ddi <= 3`
- Filtros cliente-side (en TS): cluster + search (sobre row.store + row.product)
- También calcula `reasonCounts` para los chips con contador (sin aplicar el filtro de razón actual)

**Server action** `markSuggestionsSent(ids)` en `app/sugeridos/actions.ts`:
- Hace `UPDATE suggested_orders SET status = 'sent', sent_at = now() WHERE id IN (...)`
- Llama `revalidatePath("/sugeridos")` y `revalidatePath("/")` para refrescar las dos vistas
- Verifica role: viewer NO puede marcar enviado

**CSV export** (F3): reemplaza el export ad-hoc viejo. Botón en CardHeader de SugeridosTable. Exporta seleccionados si hay selección, todos los filtrados si no.

#### Forecast (`/forecast`)

**Page:** `web/src/app/forecast/page.tsx`

**Query principal:** `loadForecast({historyDays})` — `lib/queries/forecast.ts`
- Toca: `sales` con `WHERE sale_date >= today - fetchStartDays` (fetchStartDays = max(420, historyDays+30))
- Toca: `products WHERE active = true` (para nombres + unit_price)
- Procesa TODO el cálculo de forecast en TypeScript:
  - Agrega ventas por día y por (día, producto)
  - Calcula `baseline_28d` = avg revenue/día últimos 28d
  - Calcula `seasonality_yoy` = ratio ventas mismo mes año pasado vs mes previo año pasado
  - Calcula `trend_factor` con slope semanal (mínimos cuadrados sobre últimas 8 semanas) × dampening 0.5
  - Calcula `forecast_diario = baseline × seasonality × trend_factor`
  - MAPE backtest: aplica modelo con datos cortados hace 30d, compara vs real
- Devuelve `{series, totals, topSkus}`

**URL params (F4):** `?horizon=90d|1y|2y|5y` → solo cambia cuánto histórico se carga y se muestra. Las ventanas comparativas (MoM, YoY, forecast 30d) están ancladas a "hoy" — no a período arbitrario. **Esta es la razón por la que /forecast NO usa el `<PeriodSelector>` dual** — el modelo conceptual rompería.

#### Sell-in / Sell-out (`/flow`) — NUEVO F6

**Page:** `web/src/app/flow/page.tsx`

**Query principal:** `loadFlow({start, end})` — `lib/queries/flow.ts`
- 2 queries paralelas:
  - `sales WHERE sale_date BETWEEN ? AND ?` — sell-out (units, revenue)
  - `purchase_orders WHERE status IN ('fulfilled', 'partial') AND order_date BETWEEN ? AND ?` — sell-in proxy
- Procesa en TS:
  - Agrega ambos por mes (`date_trunc('month', date)`)
  - Sell-in revenue prorateado: `value × (received/ordered)`
  - Calcula `netUnits = sellIn - sellOut` mensual
  - Calcula `cumulativeNetUnits` (running sum del net)
- Devuelve `{monthly, totals}` con `sellThroughPct = sellOut/sellIn` y `currentGapUnits` (último valor del acumulado)

**Lógica del insight automático** (server, en `page.tsx`):
- Toma los últimos 3 meses del array `monthly`
- Calcula `gapTrend = cumulative[last] - cumulative[first]`
- Si `gapTrend > 1000` → warning "Overstock acumulándose"
- Si `gapTrend < -1000` → danger "Cadena vaciándose"
- Si está en medio → success "Flujo equilibrado"

**No requiere cambios SQL** — usa tablas existentes.

#### Órdenes de compra (`/oc`)

**Page:** `web/src/app/oc/page.tsx`

**Query principal:** `loadPOOverview({status, periodStart, periodEnd, search})` — `lib/queries/po.ts`

Hace 4 queries paralelas via `Promise.all`:

1. `db.rpc("fn_po_monthly", { p_org_id })` → función SQL que devuelve `[{month_start, po_count, units_ordered, units_received, value}]` agrupado por mes
2. `db.rpc("fn_po_top_stores", { p_org_id, p_limit: 8 })` → top tiendas por valor de OCs
3. `db.rpc("fn_po_top_products", { p_org_id, p_limit: 10 })` → top productos por valor
4. `db.from("purchase_orders").select(...).limit(200)` → última 200 OCs para tabla de recientes

Después en TypeScript:
- Filtra `recent` por status / período / search
- Calcula `fillRate`, `pendingValue`, `leadTimeDays` per OC
- Si hay rows visibles, hace query adicional a `purchase_order_lines` con `count: 'exact'` agrupada por `po_id` para `lineCount`
- Calcula totales agregados, `underFillCount` (fill < 90%), `avgLeadTimeDays`, etc.

**URL params (F1):**
- `?status=` → pending/partial/fulfilled/cancelled
- `?period=` → con `includeAll`, default "all" (todo el histórico)
- `?q=` → search

#### Tiendas (`/tiendas` y `/tiendas/[id]`)

**Page listado:** `web/src/app/tiendas/page.tsx`

**Query principal:** `loadStores({cluster?, region?, start?, end?})` — `lib/queries/stores.ts`
- 2 queries paralelas:
  - `stores WHERE org_id = ? AND active = true`
  - `db.rpc("fn_store_kpis", { p_org_id, p_start?, p_end? })` ← **función refactorizada en F4**
- La RPC devuelve: `{store_id, skus_active, skus_with_stock, total_inventory_units, total_inventory_value_cost, active_stockouts, units_in_window, revenue_in_window}`
- Une por `store_id`, calcula `avgDdi` derivado en TS

**Page detalle:** `web/src/app/tiendas/[id]/page.tsx`

**Query:** `loadStoreDetail(storeId)` — `lib/queries/store-detail.ts`
- Múltiples queries: store, SKUs de la tienda con inventario+velocity, sugeridos para esa tienda, OCs recientes
- Devuelve estructura completa para el hero + tabla SKUs + sugeridos pendientes

**URL params (F4):**
- `?period=` selector dual completo (rolling/calendario/fiscal)

#### Productos (`/productos` y `/productos/[id]`)

**Page listado:** `web/src/app/productos/page.tsx`

**Query principal:** `loadProducts({start?, end?})` — `lib/queries/products.ts`
- 3 queries paralelas:
  - `products WHERE org_id = ? AND active = true`
  - `db.rpc("fn_product_kpis", { p_org_id, p_start?, p_end? })` ← **refactorizada F4**
  - `db.rpc("fn_product_weekly_sales", { p_org_id, p_weeks: 8 })` ← sparklines
- Une por `product_id`, deriva en TS:
  - `asp = revenue_in_window / units_in_window` (**F7**)
  - `aspDeltaPct` = % WoW comparando ASP de última semana vs penúltima (**F7**)

**Page detalle:** `web/src/app/productos/[id]/page.tsx`

**Query:** `loadProductDetail(productId)` — `lib/queries/product-detail.ts`
- Múltiples queries: producto, ventas semanales, tiendas que venden el SKU con inventario+velocity, sugeridos pendientes

**URL params (F4):**
- `?period=` selector dual completo

#### Cobertura (`/cobertura`) — NUEVO F2

**Page:** `web/src/app/cobertura/page.tsx`

**Query principal:** `loadCoverageMatrix()` — `lib/queries/coverage.ts`
- 3 queries paralelas:
  - `stores WHERE active = true`
  - `products WHERE active = true`
  - `vw_inventory_with_velocity` (vista que ya existía desde Fase 3, devuelve por (store, product): inventory + velocity + DDI)
- Une todo en memoria, devuelve `{stores, products, cells, clusters, regions, categories, totals}`
- `cells[]` tiene ~1500 items (50 stores × 30 SKUs); payload ~100KB

**Cliente:** `components/cobertura/CoverageMatrix.tsx`
- TODA la lógica de filtrado/agrupación es client-side (`useMemo`)
- 4 métricas intercambiables sin re-fetch: DDI, Inventario, Velocidad, Quiebres
- Tooltip al hover, drill-down al detalle del producto

#### Reportes (`/reportes`) — NUEVO F8

**Page:** `web/src/app/reportes/page.tsx`

**Query principal:** `loadReports({start, end, categoryFilter?, clusterFilter?, regionFilter?})` — `lib/queries/reports.ts`
- 4 queries paralelas:
  - `products WHERE active = true`
  - `stores WHERE active = true AND is_cedis = false`
  - `sales WHERE sale_date BETWEEN ? AND ?`
  - `vw_latest_inventory` para inventory actual por (product, store)
- Agrega en TS a granularidad `(productId × storeId × month)` con `units`, `revenue`, `currentInventory`
- Aplica filtros de categoría/cluster/región al construir los maps

**Cliente:** `components/reportes/PivotBuilder.tsx`
- Recibe facts pre-agrupados
- Pivot por dimensión seleccionada (groupBy) en `useMemo`
- 4 métricas toggleables: unidades, revenue, ASP, inventario
- Sort by cualquier métrica activa
- Footer con totales
- CSV export del agrupado actual

#### Reporte PDF (`/reporte`) — NUEVO F5

**Page:** `web/src/app/reporte/page.tsx`

**Queries:** reusa `loadHomeData`, `loadHomeStats`, `loadLostSaleLedger` del Home + `verifySession`.

**Cliente:** `components/reporte/PrintActions.tsx` — barra con botón imprimir + autoprint si `?print=1`

**CSS print:** `app/globals.css → @media print` block — oculta sidebar/topbar, fuerza A4 12mm/14mm, resetea paddings, `body { background: white }`, `.break-inside-avoid` para secciones.

**Layout:** `app/reporte/layout.tsx` — wrapper que rompe los paddings del root layout para que el reporte ocupe ancho completo.

### Helpers compartidos

#### `lib/period.ts` (F1)

Server-only. Maneja la conversión de URL param → ventana de fechas.

- `loadFiscalPeriods(chainSlug)` — query `chain_calendars` filtrada por chain. Devuelve array de `{code, year, number, start, end}`.
- `resolvePeriod(raw, fiscalPeriods)` — parser que entiende:
  - `7d` / `30d` / `90d` → rolling desde hoy
  - `cal:YYYY-MM` → mes calendario (recortado a hoy si es el actual)
  - `cal:YYYY` → año completo (recortado)
  - `cal:ytd` → year-to-date
  - `fis:P##-YYYY` → busca período en lista de fiscal
  - `fis:YYYY` → suma todos los períodos fiscales del año
  - `fis:ytd` → períodos del año actual hasta hoy
  - cualquier inválido → fallback `30d`
- `buildPeriodOptions(fiscalPeriods)` — genera 3 listas para el selector: rolling (3 opciones), calendar (YTD + 6 meses + año anterior), fiscal (YTD + 6 períodos + años cerrados)

#### `lib/csv.ts` (F3)

Client-safe. No requiere supabase.

- `rowsToCsv(rows, columns)` — escape correcto (`"` → `""`, comillas si hay `,`/`"`/`\n`/`\r`/`;`)
- `downloadCsv(filename, body)` — Blob + URL.createObjectURL + anchor click, con BOM UTF-8 `﻿`
- `todayStamp()` — sufijo `YYYY-MM-DD`

#### `components/shared/PeriodSelector.tsx` (F1)

Client. Recibe el resultado de `buildPeriodOptions` + el `raw` actual. Dropdown con 3 columnas (Rolling / Calendario / Fiscal). Variante `includeAll` agrega botón "Todo el histórico" arriba (para /oc).

#### `components/shared/CsvExportButton.tsx` (F3)

Client. Genérico tipado: `<CsvExportButton<T> rows={array | () => T[]} columns={CsvColumn<T>[]} filename={string}>`. Las columnas se definen como `{ header, accessor, format? }`.

### Cómo escribir una vista nueva

Recipe canónico para agregar `/[nueva-vista]`:

1. **Query** en `lib/queries/[nueva].ts` (server-only):
   ```ts
   import "server-only";
   import { supabaseServer } from "@/lib/supabase/ssr";
   import { verifySession } from "@/lib/dal";

   export async function loadXxx(opts: {...} = {}): Promise<...> {
     const { orgId } = await verifySession();   // siempre primero
     const db = await supabaseServer();         // siempre con cookies
     // queries
   }
   ```
2. **Página** en `app/[nueva]/page.tsx` (RSC default):
   - `searchParams: Promise<{...}>` (Next 16)
   - Resolver URL params al inicio
   - `Promise.all` para fetch paralelo
   - Pasar todo a Server Components o Client Components específicos
3. **Componentes** en `components/[nueva]/`:
   - `<NuevaHero>` (client) — chart + KPIs
   - `<NuevaFilters>` (client) — URL state
   - `<NuevaTable>` o `<NuevaGrid>` (server idealmente)
4. **Loading** en `app/[nueva]/loading.tsx` con skeletons de `components/shared/PageSkeletons.tsx`
5. **Sidebar item** en `components/layout/AppSidebar.tsx`
6. **Si requiere SQL nuevo**: crear archivo `sql/0N_*.sql` numerado, versionarlo, aplicarlo via Supabase Dashboard o MCP `apply_migration`. **NUNCA** crear funciones directo en Supabase sin commitearlas en el repo (fue el bug de F4 — `fn_*_kpis` vivían solo en BD).

### Patrones de RPC vs query directa

**Usar `db.rpc(fn_name, params)` cuando:**
- La agregación es compleja (multi-join, full outer join, ventanas)
- Performance: una RPC evita N+1 cuando hay muchos productos/tiendas
- Reusabilidad: la misma función la consume el dashboard y un reporte

**Usar `db.from(table).select()` cuando:**
- Es un SELECT simple con filtros
- El resultado se procesa más en TS (sumas, agrupaciones derivadas)
- Necesitas `count: 'exact'` o paginación

**Ejemplo concreto:** `loadPOOverview` mezcla: usa RPC para las 3 agregaciones (`fn_po_monthly`, `fn_po_top_stores`, `fn_po_top_products`) y query directa para los 200 POs recientes. Está bien — son use cases distintos.

### Estado del SQL en repo (al 2026-05-14)

```
sql/
├── 00_schema.sql              ← Fase 1: tablas + RLS + triggers
├── 01_seeds.sql               ← Fase 1: chains + calendario fiscal HEB
├── 02_views.sql               ← Fase 3: 6 vistas
├── 03_functions.sql           ← Fase 3: motor sugeridos
├── 04_kpi_functions.sql       ← Sesión 2026-05-14: snapshot pre-F4
└── 05_kpi_functions_ranged.sql ← Sesión 2026-05-14: refactor con params
```

**Aplicado en Supabase** (proyecto `qsxetwkwdsylfweatlhp`): todo el repo + ajustes posteriores (drop overload viejo de `fn_product_weekly_sales`).

**Forma de reproducir el estado** en proyecto nuevo: aplicar archivos en orden 00 → 01 → 02 → 03 → 04 → 05.

**Migraciones manuales aplicadas en Supabase fuera del repo** (a documentar si se hace más):
- Grants `service_role` + `authenticated` cuando "auto-expose new tables" estuvo OFF (Fase 1)
- `stores.cluster` column (Fase 1)
- `auth_org_id()` optimizada para JWT (Fase 5)
- Trigger `trg_sync_user_org_to_jwt` (Fase 5)
- Helper `admin_create_user` (Fase 5)

**Pendiente de versionar en sql/:** las migraciones de Fase 5 (auth) deberían vivir en `sql/06_auth.sql`. Por ahora se reconstruyen siguiendo el documento.
