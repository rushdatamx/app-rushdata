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
