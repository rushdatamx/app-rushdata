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
