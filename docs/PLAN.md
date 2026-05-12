# PLAN — Paso a paso del MVP

> Plan ejecutable de cero a Delikos operando en la plataforma. Cada paso indica QUIÉN lo hace (Mario o Claude) y qué entregable produce.

---

## FASE 0 — Setup de cuentas (~30 min)

### 0.1 Crear cuenta Supabase
- **Quién:** Mario
- **Cómo:** ir a [supabase.com](https://supabase.com) → New Project
- **Nombre proyecto:** `rushdata-portal`
- **Región:** US East (Northern Virginia) — más cerca de México que EU
- **Password:** generar fuerte, guardar en 1Password
- **Plan:** Free tier para arrancar (500MB, 2GB egress, 50k MAU). Upgrade a Pro ($25/mes) cuando Delikos esté usando.
- **Entregable:** Project URL + service_role key + anon key guardados.

### 0.2 Crear cuenta Vercel + GitHub
- **Quién:** Mario
- **Cómo:** Login Vercel con GitHub
- **Repo nuevo:** `rushdatamx/portal` (privado)
- **Entregable:** Repo URL.

### 0.3 Comprar dominio (si no se tiene)
- **Quién:** Mario
- **Recomendación:** ya tienes `rushdata.com.mx`, configurar subdominio `app.rushdata.com.mx`.
- **DNS:** apuntar CNAME a Vercel cuando se haga deploy.

### 0.4 ~~Resend~~ — movido a Fase 5

> Para magic links de login NO se necesita Resend. Supabase Auth los manda gratis desde su propio dominio. Resend solo entra cuando agregamos alertas custom (correo diario), que es Fase 5.

---

## FASE 1 — Database (2-3 días)

### 1.1 Correr schema en Supabase
- **Quién:** Mario (Claude lo guía paso a paso si hay errores)
- **Cómo:**
  1. Abrir Supabase Dashboard → SQL Editor
  2. Copiar contenido de `sql/00_schema.sql`
  3. Run
  4. Verificar en Table Editor que aparezcan las 16 tablas
- **Entregable:** Schema cargado, RLS habilitado.

### 1.2 Correr seeds
- **Quién:** Mario
- **Cómo:**
  1. SQL Editor → cargar `sql/01_seeds.sql`
  2. Run
  3. Verificar: `select * from chains` → 3 filas; `select * from organizations` → 1 fila (Delikos); `select count(*) from chain_calendars` → 26 filas (HEB)
- **Entregable:** Chains, calendario HEB, organización Delikos, 6 productos cargados.

### 1.3 Crear usuario admin para Mario
- **Quién:** Mario
- **Cómo:**
  1. Supabase Dashboard → Authentication → Add user → mario@rushdata.com.mx
  2. SQL Editor:
     ```sql
     insert into users (id, org_id, email, role)
     values (
       (select id from auth.users where email = 'mario@rushdata.com.mx'),
       (select id from organizations where slug = 'delikos'),
       'mario@rushdata.com.mx',
       'admin'
     );
     ```
- **Entregable:** Mario puede hacer login eventualmente.

### 1.4 Verificar RLS funciona
- **Quién:** Claude (corre queries de prueba via SQL Editor)
- **Cómo:**
  1. Como `service_role` → hacer un insert de prueba en `products`
  2. Como `anon` con sesión de Mario → debería ver solo productos de Delikos
- **Entregable:** Confirmación que RLS aísla orgs.

---

## FASE 2 — Ingesta HEB (3-4 días)

> Aquí adaptamos los scripts que ya tienes en `kam-data/agents/mitienda/` para que escriban a Supabase en lugar de a Excel.

### 2.1 Crear bucket Storage para archivos raw
- **Quién:** Mario
- **Cómo:** Supabase Dashboard → Storage → New Bucket `raw-files` (privado).
- **Estructura:** `raw-files/heb/{tipo}/{YYYY-MM-DD}-{archivo}.xlsx`

### 2.2 Setup proyecto Python de ingesta
- **Quién:** Claude
- **Dónde:** `PORTAL/ingest/`
- **Crear:**
  - `requirements.txt` — pandas, openpyxl, supabase-py, python-dotenv
  - `.env.example` — SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
  - `shared/db.py` — cliente Supabase compartido
  - `shared/ingestion_run.py` — wrapper que registra en `ingestion_runs`
  - `heb/load_stores.py` — carga catálogo de tiendas
  - `heb/load_inventory.py` — adaptar de `mitienda` actual
  - `heb/load_sales.py` — adaptar
  - `heb/load_po.py` — adaptar
- **Entregable:** Scripts ejecutables `python -m ingest.heb.load_inventory archivo.xlsx`.

### 2.3 Cargar histórico de Delikos
- **Quién:** Mario corre, Claude troubleshootea
- **Cómo:**
  1. `python -m ingest.heb.load_stores ../kam-data/mitienda/raw/tiendas-mitienda-delikos.xls`
  2. Por cada archivo en `kam-data/mitienda/raw/inventario/` → `load_inventory`
  3. `kam-data/mitienda/raw/venta-delikos.xls` → `load_sales`
  4. Cada `*-OC-MITIENDA.xlsx` → `load_po`
- **Entregable:** Base de datos con ~30 días de inventario, ~90 días de ventas, OCs históricos.

### 2.4 Validar datos
- **Quién:** Claude (corre queries de sanity check)
- **Cómo:** queries tipo:
  ```sql
  select count(*) from stores where org_id = (select id from organizations where slug='delikos');
  -- Esperado: 26
  
  select min(snapshot_date), max(snapshot_date), count(distinct snapshot_date)
  from inventory_snapshots where org_id = (...);
  
  select period_code, sum(units), sum(revenue_no_tax)
  from sales where org_id = (...)
  group by period_code order by period_code desc limit 5;
  ```
- **Entregable:** Confirmación que números coinciden con los reportes actuales de Mario en kam-data.

---

## FASE 3 — Motor de sugeridos (3-4 días)

### 3.1 Crear `sql/02_views.sql` (vistas auxiliares)
- **Quién:** Claude
- **Contenido:**
  - `vw_latest_inventory` — última snapshot por (org, store, product)
  - `vw_velocity_28d` — venta promedio diaria últimos 28 días
  - `vw_active_pos_pending` — unidades pendientes por OC por (store, product)
  - `vw_active_stockouts` — stockouts vigentes

### 3.2 Crear `sql/03_functions.sql` (motor)
- **Quién:** Claude
- **Funciones:**
  - `fn_compute_suggestions(p_org_id uuid)` — genera sugeridos para una org
  - `fn_compute_stockouts(p_org_id uuid)` — detecta quiebres
  - `fn_compute_daily_kpis(p_org_id uuid)` — actualiza snapshot diario
  - `fn_run_engine(p_org_id uuid)` — orquesta las 3 anteriores

### 3.3 Schedule con pg_cron
- **Quién:** Claude
- **Cómo:**
  ```sql
  select cron.schedule(
    'daily-engine-04am',
    '0 10 * * *',  -- 04:00 MX = 10:00 UTC
    $$ select fn_run_engine(id) from organizations where active = true $$
  );
  ```
- **Entregable:** Job programado.

### 3.4 Test manual end-to-end
- **Quién:** Mario corre, Claude valida
- **Cómo:**
  1. `select fn_run_engine((select id from organizations where slug='delikos'));`
  2. `select count(*) from suggested_orders where org_id = (...);`
  3. Comparar contra sugeridos que Mario haría a mano con kam-data → deben coincidir ±5%.

---

## FASE 4 — Frontend (5-7 días)

### 4.1 Scaffold Next.js
- **Quién:** Claude
- **Cómo:**
  ```bash
  cd /Users/jmariopgarcia/Desktop/2026/RushData/PORTAL
  npx create-next-app@latest web --typescript --tailwind --app --no-src-dir
  cd web
  npx shadcn@latest init
  npm i @supabase/ssr @supabase/supabase-js @tanstack/react-table @tanstack/react-virtual tremor lucide-react sonner cmdk nuqs zod react-hook-form @hookform/resolvers
  ```
- **Configurar:**
  - `next.config.js` — env vars
  - `tailwind.config.ts` — tokens del FRONTEND.md
  - `app/globals.css` — Plus Jakarta + JetBrains Mono via next/font
  - `lib/supabase/server.ts` y `lib/supabase/client.ts`
- **Entregable:** App corriendo en `localhost:3000`.

### 4.2 Auth flow
- **Quién:** Claude
- **Crear:**
  - `app/(auth)/login/page.tsx` — magic link
  - `middleware.ts` — protege rutas `/app/*`
  - `app/auth/callback/route.ts` — callback Supabase
- **Entregable:** Mario puede hacer login con email.

### 4.3 Layout base (sidebar + topbar)
- **Quién:** Claude (invocar `/frontend-design`)
- **Crear:**
  - `app/(app)/layout.tsx` — sidebar + topbar + main
  - `components/sidebar.tsx`
  - `components/topbar.tsx`
  - `components/chain-switcher.tsx`
- **Entregable:** Layout vacío visible, navegable.

### 4.4 Página Home
- **Quién:** Claude
- **Crear:**
  - `app/(app)/page.tsx` — Server Component que carga KPIs
  - `components/kpi-card.tsx`
  - `components/actionable-table.tsx`
- **Entregable:** Home funcional con datos reales de Delikos.

### 4.5 Página Sugeridos
- **Quién:** Claude
- **Crear:**
  - `app/(app)/sugeridos/page.tsx`
  - `components/suggestions-table.tsx` — con filtros via nuqs
  - `components/suggestion-detail.tsx` — drawer expandible
- **Entregable:** Lista filtrable, exportable, con detail drawer.

### 4.6 Página Tiendas y Productos
- **Quién:** Claude
- **Estructura similar:** lista → detail.

### 4.7 Skill review pass
- **Quién:** Claude (invocar `/frontend-design` y `/simplify`)
- **Entregable:** Revisión completa visual y de calidad de código.

---

## FASE 5 — Polish + Deploy (2-3 días)

### 5.0 Crear cuenta Resend (recién aquí)
- **Quién:** Mario
- **Cómo:** [resend.com](https://resend.com), free tier 3k emails/mes.
- **Verificar dominio** `rushdata.com.mx` para enviar desde `alertas@rushdata.com.mx`.
- **Entregable:** API key de Resend lista para usar en 5.1.

### 5.1 Email alerts
- **Quién:** Claude
- **Crear:** Edge Function `daily-alert-email` que se dispara después del motor:
  - Trae sugeridos críticos del día
  - Renderiza email con React Email
  - Envía vía Resend
- **Entregable:** Mario recibe email cada mañana.

### 5.2 Deploy a Vercel
- **Quién:** Mario
- **Cómo:**
  1. Push del repo a GitHub
  2. Vercel → Import → seleccionar repo
  3. Env vars: SUPABASE_URL, SUPABASE_ANON_KEY, RESEND_API_KEY
  4. Deploy
  5. Configurar dominio `app.rushdata.com.mx`
- **Entregable:** App en producción.

### 5.3 Smoke test E2E
- **Quién:** Mario (Claude observa logs)
- **Pasos:**
  1. Login con magic link
  2. Ver home cargada
  3. Filtrar sugeridos por tienda Punta Norte
  4. Marcar 3 sugeridos como `sent`
  5. Recibir email del día siguiente
- **Entregable:** Producto usable.

---

## FASE 6 — Dogfood (2 semanas)

### 6.1 Mario usa PORTAL en lugar de kam-data
- Una semana usando ambos en paralelo (verificación)
- Una semana solo PORTAL
- Issue tracker: archivo `docs/ISSUES.md` en repo

### 6.2 Iteración de fricciones
- Cualquier paso que Mario tenga que hacer "mentalmente" → automatizar en producto

---

## FASE 7 — Primer cliente externo

### 7.1 Onboarding manual
- Mario contacta 1 proveedor que él conozca y vende a HEB
- Setup manual: nueva organización, sus productos, sus tiendas, sus datos históricos
- Acompaña 2 semanas

### 7.2 Documentar onboarding
- Cuando se haga el 2do cliente, escribir guía interna
- Cuando se haga el 5to, automatizar onboarding self-service

---

## Resumen visual del flujo de datos

```
[Portal HEB]
     ↓ (Mario descarga manual)
[archivos .xls en local]
     ↓ (script python)
[Supabase Storage (raw archive)]
     ↓ (mismo script)
[tablas: stores, products, inventory_snapshots, sales, purchase_orders]
     ↓ (pg_cron 04:00 diario)
[motor: suggested_orders, stockout_alerts, daily_kpis]
     ↓
[Next.js dashboard / email alerts]
     ↓
[Cliente toma decisión y marca sugerido como 'sent']
```

---

## Costos estimados mensuales (MVP)

| Servicio | Costo | Notas |
|---|---|---|
| Supabase Free | $0 | Hasta 500MB DB, 2GB egress |
| Supabase Pro | $25 | Cuando llegues a límites |
| Vercel Hobby | $0 | Limit comercial — upgrade necesario para clientes |
| Vercel Pro | $20 | Cuando tengas cliente externo |
| Resend Free | $0 | Hasta 3k emails/mes, 100/día |
| Dominio | ~$15/año | Ya lo tienes |
| **MVP total** | **$0–25/mes** | Hasta que entre cliente externo |
| **Producción** | **~$45–50/mes** | Pro tiers |

---

## Quién hace qué (resumen)

| Fase | Mario | Claude |
|---|---|---|
| 0. Setup cuentas | ✅ | Guía |
| 1. Database | Ejecutar SQL | Diseña + troubleshootea |
| 2. Ingesta | Corre scripts | Diseña + escribe scripts |
| 3. Motor | Ejecutar tests | Diseña funciones SQL |
| 4. Frontend | Revisar visual | Diseña + codea |
| 5. Deploy | Vercel + DNS | Email function |
| 6. Dogfood | Usa el producto | Itera bugs |
| 7. Primer cliente | Vende + onboardea | Soporte técnico |
