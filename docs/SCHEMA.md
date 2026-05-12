# SCHEMA — Modelo de datos canónico

> Diseñado para soportar HEB hoy y CUALQUIER cadena comercial mañana sin tocar estructura. Todo cambio al schema vivo se hace con archivos `sql/04+_*.sql` (migraciones), nunca editando `00_schema.sql` después de producción.

## Principios

1. **Multi-tenant por `org_id`.** Toda tabla con datos de cliente lleva `org_id`. RLS lo enforza.
2. **Multi-cadena por `chain_id`.** Lo que cambia entre cadenas son **datos**, no **tablas**.
3. **Catálogos compartidos.** `chains`, `chain_calendars` los mantiene Mario (no el cliente).
4. **Tablas transaccionales delgadas.** Inventario, ventas, OCs van append-only con `snapshot_date` o `period_code`.
5. **Capa derivada separada.** `suggested_orders`, `stockout_alerts` se calculan, no se insertan a mano.
6. **UPCs y códigos externos como `text`.** Nunca enteros — pueden tener ceros líderes.
7. **Dinero como `numeric(14,2)`.** Float está prohibido para money.

---

## Diagrama lógico

```
                    ┌──────────────┐
                    │ organizations│
                    └──────┬───────┘
                           │ 1:N
              ┌────────────┼────────────────┐
              │            │                │
              ▼            ▼                ▼
        ┌─────────┐   ┌─────────┐    ┌─────────────┐
        │  users  │   │ stores  │    │  products   │
        └─────────┘   └────┬────┘    └──────┬──────┘
                           │                │
                    ┌──────┴────────────────┘
                    ▼
   ┌─────────────────────────────────────────────┐
   │   inventory_snapshots / sales / pos / lines │
   └─────────────────────────────────────────────┘
                    │
                    ▼ (motor sugeridos)
   ┌─────────────────────────────────────────────┐
   │  suggested_orders / stockout_alerts         │
   └─────────────────────────────────────────────┘

   ┌──────────────┐         ┌──────────────────┐
   │   chains     │◄────────┤ chain_calendars  │
   └──────────────┘         └──────────────────┘
   (global, mantenidos por Mario)
```

---

## Tablas (overview)

### Capa 1 — Tenancy y usuarios
- `organizations` — Cada cliente del SaaS
- `users` — Usuarios dentro de cada org (con rol)
- `org_chain_access` — Qué cadenas puede ver cada org (FK a `chains`)

### Capa 2 — Catálogos globales (Mario los mantiene)
- `chains` — HEB, MERCO, ALSUPER, Walmart…
- `chain_calendars` — Periodos fiscales por cadena
- `chain_holidays` — (futuro) días no-vendibles

### Capa 3 — Catálogos por organización
- `products` — Catálogo SKUs del cliente (por `org_id`)
- `product_packaging` — Reglas de empaque (cajas, tarimas) por producto
- `stores` — Tiendas (`org_id` + `chain_id`)
- `store_segments` — (futuro) GRANDE/CHICA por tienda

### Capa 4 — Datos transaccionales (lo gordo)
- `inventory_snapshots` — Snapshots diarios
- `sales` — Sell-out granular
- `purchase_orders` — Cabeceras de OC
- `purchase_order_lines` — Detalle por tienda/SKU/OC

### Capa 5 — Capa derivada (calculada)
- `suggested_orders` — Sugeridos de pedido vigentes
- `stockout_alerts` — Quiebres detectados
- `daily_kpis` — Snapshot diario de KPIs por org (para histórico de dashboard)

### Capa 6 — Operativa
- `ingestion_runs` — Cada vez que Mario sube datos, queda registro
- `audit_log` — Cambios sensibles

---

## DDL completo

El SQL completo está en `sql/00_schema.sql`. Esta sección documenta cada tabla.

### `organizations`

```sql
create table organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                    -- 'delikos', 'sabritas'
  name text not null,                           -- 'Delikos S.A. de C.V.'
  plan text not null default 'pilot',           -- 'pilot', 'starter', 'pro'
  active boolean not null default true,
  created_at timestamptz not null default now()
);
```

### `users`

```sql
create table users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'viewer',          -- 'admin', 'editor', 'viewer'
  created_at timestamptz not null default now()
);
```

> Nota: `auth.users` es la tabla nativa de Supabase Auth. Esta tabla es el "perfil extendido" enlazado.

### `chains`

```sql
create table chains (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,                    -- 'heb', 'merco', 'alsuper'
  name text not null,                           -- 'HEB México'
  country text not null default 'MX',
  calendar_type text not null default 'gregorian', -- 'gregorian' o 'fiscal'
  created_at timestamptz not null default now()
);
```

### `chain_calendars` (solo si calendar_type = 'fiscal')

```sql
create table chain_calendars (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references chains(id),
  period_code text not null,                    -- 'P12-2025'
  period_year int not null,
  period_number int not null,
  period_start date not null,
  period_end date not null,
  unique (chain_id, period_code)
);
```

Para HEB: 13 periodos por año, ~4 semanas cada uno. Mario carga esto una vez por año.

### `org_chain_access`

```sql
create table org_chain_access (
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id) on delete cascade,
  enabled boolean not null default true,
  primary key (org_id, chain_id)
);
```

### `products`

```sql
create table products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  upc text not null,
  name text not null,
  category text,                                -- 'tostadas', 'papas', 'fyv'
  subcategory text,
  size_grams int,
  unit_cost numeric(14,2),
  unit_price numeric(14,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, upc)
);
```

### `product_packaging`

> Cada producto puede tener empaque distinto por cadena (HEB pide en cajas, MERCO en tarimas, etc).

```sql
create table product_packaging (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  chain_id uuid references chains(id),         -- null = aplica a todas
  units_per_case int not null,                  -- ej 24
  cases_per_pallet int,                         -- ej 10 = 240 unidades
  min_order_units int,                          -- mínimo por tienda
  order_multiple int not null default 1,        -- redondear a múltiplos de N
  notes text,
  unique (product_id, chain_id)
);
```

### `stores`

```sql
create table stores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  external_code text not null,                  -- código del retailer (ej '0142')
  name text not null,
  region text,
  city text,
  state text,
  size_tier text,                               -- 'GRANDE', 'CHICA', null
  active boolean not null default true,
  is_cedis boolean not null default false,      -- excluir de análisis sell-out
  created_at timestamptz not null default now(),
  unique (org_id, chain_id, external_code)
);
```

### `inventory_snapshots`

```sql
create table inventory_snapshots (
  id bigserial primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  snapshot_date date not null,
  units numeric(14,2) not null default 0,
  days_of_inventory numeric(8,2),               -- DDI / DOS calculado por la cadena
  value_at_cost numeric(14,2),
  value_at_retail numeric(14,2),
  ingestion_run_id uuid,
  created_at timestamptz not null default now(),
  unique (org_id, store_id, product_id, snapshot_date)
);

create index idx_inv_org_date on inventory_snapshots(org_id, snapshot_date desc);
create index idx_inv_product_date on inventory_snapshots(product_id, snapshot_date desc);
```

### `sales`

```sql
create table sales (
  id bigserial primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  sale_date date not null,
  period_code text,                             -- 'P12-2025' (HEB) o null (gregorian)
  units numeric(14,2) not null default 0,
  revenue_no_tax numeric(14,2) not null default 0,
  price_avg numeric(14,2),
  ingestion_run_id uuid,
  created_at timestamptz not null default now(),
  unique (org_id, store_id, product_id, sale_date)
);

create index idx_sales_org_date on sales(org_id, sale_date desc);
create index idx_sales_period on sales(org_id, period_code);
```

### `purchase_orders`

```sql
create table purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  po_number text not null,
  order_date date not null,
  expected_delivery_date date,
  status text not null default 'pending',       -- pending|partial|fulfilled|cancelled
  total_units_ordered numeric(14,2),
  total_units_received numeric(14,2),
  total_value numeric(14,2),
  ingestion_run_id uuid,
  created_at timestamptz not null default now(),
  unique (org_id, chain_id, po_number)
);
```

### `purchase_order_lines`

```sql
create table purchase_order_lines (
  id bigserial primary key,
  po_id uuid not null references purchase_orders(id) on delete cascade,
  store_id uuid references stores(id),          -- null para OC bulk a CEDIS (MERCO)
  product_id uuid not null references products(id),
  units_ordered numeric(14,2) not null,
  units_received numeric(14,2) not null default 0,
  units_pending numeric(14,2) generated always as (units_ordered - units_received) stored,
  fill_rate numeric(5,2) generated always as (
    case when units_ordered > 0
    then (units_received / units_ordered) * 100
    else null end
  ) stored
);

create index idx_pol_po on purchase_order_lines(po_id);
create index idx_pol_product on purchase_order_lines(product_id);
```

### `suggested_orders`

```sql
create table suggested_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  generated_at timestamptz not null default now(),
  for_period text,                              -- semana ISO o periodo HEB
  suggested_units numeric(14,2) not null,
  suggested_cases int,
  suggested_pallets int,
  current_inventory numeric(14,2),
  current_ddi numeric(8,2),
  velocity_daily numeric(10,4),                 -- venta promedio diaria últimas 4 semanas
  reason_code text not null,                    -- 'low_ddi'|'velocity_up'|'stockout_risk'|'periodic_replenish'
  reason_detail text,
  estimated_lost_sale numeric(14,2),
  confidence numeric(3,2),                      -- 0.00 - 1.00
  status text not null default 'new',           -- 'new'|'sent'|'fulfilled'|'ignored'
  notes text
);

create index idx_sugg_org_status on suggested_orders(org_id, status, generated_at desc);
```

### `stockout_alerts`

```sql
create table stockout_alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  alert_date date not null,
  severity text not null,                       -- 'critical' (DDI=0), 'high' (DDI<7), 'medium' (DDI<15)
  days_in_stockout int,
  lost_sale_estimate numeric(14,2),
  resolved boolean not null default false,
  resolved_at timestamptz,
  unique (org_id, store_id, product_id, alert_date)
);
```

### `daily_kpis` (snapshot para histórico de dashboard)

```sql
create table daily_kpis (
  id bigserial primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  kpi_date date not null,
  total_inventory_value numeric(14,2),
  total_stockouts int,
  total_lost_sale_estimate numeric(14,2),
  avg_fill_rate numeric(5,2),
  total_active_pos int,
  metadata jsonb,                               -- extras según cadena
  unique (org_id, chain_id, kpi_date)
);
```

### `ingestion_runs`

```sql
create table ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  chain_id uuid not null references chains(id),
  data_type text not null,                      -- 'inventory'|'sales'|'po'
  source_file text,                             -- path en Supabase Storage
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running',       -- 'running'|'success'|'failed'
  rows_inserted int,
  rows_updated int,
  rows_skipped int,
  error_message text,
  triggered_by uuid references users(id)
);
```

---

## Row Level Security (RLS)

Toda tabla con `org_id` lleva esta política base:

```sql
alter table inventory_snapshots enable row level security;

create policy "Users see own org data"
  on inventory_snapshots
  for all
  using (
    org_id in (
      select org_id from users where id = auth.uid()
    )
  );
```

Las tablas globales (`chains`, `chain_calendars`) son `select` para autenticados, `insert/update/delete` solo via `service_role`:

```sql
alter table chains enable row level security;
create policy "Anyone authenticated can read" on chains for select using (auth.role() = 'authenticated');
```

Mario opera como `service_role` desde los scripts Python de ingesta.

---

## Convenciones de naming

- Tablas: plural, snake_case
- Columnas: snake_case
- Foreign keys: `{singular_table}_id` (ej `product_id`)
- Booleans: prefijo `is_`, `has_`, `active`
- Timestamps: `created_at`, `updated_at`, `deleted_at`
- Soft delete: columna `active boolean` o `deleted_at timestamptz` (depende de la tabla)

---

## Decisiones explícitas (y rechazadas)

### ✅ Decidido
- `numeric(14,2)` para dinero — precisión sin pérdida
- `text` para UPCs — protege ceros líderes
- `bigserial` para tablas transaccionales (inventory, sales) — más rápido que UUID, no necesitamos sharear estos IDs
- `uuid` para tablas de catálogo y derivadas — facilita exposición a frontend
- Periodos fiscales como tabla aparte (`chain_calendars`) — limpia y reutilizable

### ❌ Rechazado
- ❌ Tabla `inventario_heb` separada de `inventario_merco` — viola schema canónico
- ❌ Usar `float` para `value_at_cost` — pérdida de precisión, no
- ❌ UPC como `bigint` — ceros líderes se pierden
- ❌ Guardar OC como JSONB único — perder queryability
- ❌ Trigger automático para recalcular sugeridos en cada insert — costoso; mejor cron diario

---

## Migraciones futuras

Cuando agreguemos una cadena nueva, NO se toca este schema. Solo:

1. `insert into chains (slug, name, calendar_type) values ('walmart', 'Walmart México', 'gregorian');`
2. Si la cadena tiene calendario fiscal, llenar `chain_calendars`.
3. Cargar productos y stores con `chain_id` correspondiente.
4. Listo.

Si la cadena necesita un campo nuevo NUNCA visto antes (ej "código de barras secundario"), evaluar:
- Si es general → migración del schema con `04_add_field.sql`
- Si es específico de la cadena → usar columna `metadata jsonb` en la tabla relevante
