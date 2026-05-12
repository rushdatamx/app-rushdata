-- ============================================================
-- PORTAL — Schema canónico v1
-- Correr en Supabase SQL Editor en orden
-- Idempotente: usa "if not exists" donde aplica
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Extensiones
-- ────────────────────────────────────────────────────────────
create extension if not exists "pgcrypto";

-- ────────────────────────────────────────────────────────────
-- Capa 1: Tenancy
-- ────────────────────────────────────────────────────────────
create table if not exists organizations (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  plan text not null default 'pilot',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table if not exists users (
  id uuid primary key references auth.users(id) on delete cascade,
  org_id uuid not null references organizations(id) on delete cascade,
  email text not null,
  role text not null default 'viewer' check (role in ('admin', 'editor', 'viewer')),
  created_at timestamptz not null default now()
);

create index if not exists idx_users_org on users(org_id);

-- ────────────────────────────────────────────────────────────
-- Capa 2: Catálogos globales
-- ────────────────────────────────────────────────────────────
create table if not exists chains (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  country text not null default 'MX',
  calendar_type text not null default 'gregorian' check (calendar_type in ('gregorian', 'fiscal')),
  created_at timestamptz not null default now()
);

create table if not exists chain_calendars (
  id uuid primary key default gen_random_uuid(),
  chain_id uuid not null references chains(id) on delete cascade,
  period_code text not null,
  period_year int not null,
  period_number int not null,
  period_start date not null,
  period_end date not null,
  unique (chain_id, period_code)
);

create index if not exists idx_calendar_chain_dates on chain_calendars(chain_id, period_start, period_end);

create table if not exists org_chain_access (
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id) on delete cascade,
  enabled boolean not null default true,
  primary key (org_id, chain_id)
);

-- ────────────────────────────────────────────────────────────
-- Capa 3: Catálogos por organización
-- ────────────────────────────────────────────────────────────
create table if not exists products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  upc text not null,
  name text not null,
  category text,
  subcategory text,
  size_grams int,
  unit_cost numeric(14,2),
  unit_price numeric(14,2),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (org_id, upc)
);

create index if not exists idx_products_org on products(org_id);

create table if not exists product_packaging (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references products(id) on delete cascade,
  chain_id uuid references chains(id),
  units_per_case int not null,
  cases_per_pallet int,
  min_order_units int,
  order_multiple int not null default 1,
  notes text,
  unique (product_id, chain_id)
);

create table if not exists stores (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  external_code text not null,
  name text not null,
  region text,
  city text,
  state text,
  size_tier text,
  active boolean not null default true,
  is_cedis boolean not null default false,
  created_at timestamptz not null default now(),
  unique (org_id, chain_id, external_code)
);

create index if not exists idx_stores_org_chain on stores(org_id, chain_id);

-- ────────────────────────────────────────────────────────────
-- Capa 4: Datos transaccionales
-- ────────────────────────────────────────────────────────────
create table if not exists inventory_snapshots (
  id bigserial primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  snapshot_date date not null,
  units numeric(14,2) not null default 0,
  days_of_inventory numeric(8,2),
  value_at_cost numeric(14,2),
  value_at_retail numeric(14,2),
  ingestion_run_id uuid,
  created_at timestamptz not null default now(),
  unique (org_id, store_id, product_id, snapshot_date)
);

create index if not exists idx_inv_org_date on inventory_snapshots(org_id, snapshot_date desc);
create index if not exists idx_inv_product_date on inventory_snapshots(product_id, snapshot_date desc);
create index if not exists idx_inv_store_date on inventory_snapshots(store_id, snapshot_date desc);

create table if not exists sales (
  id bigserial primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  sale_date date not null,
  period_code text,
  units numeric(14,2) not null default 0,
  revenue_no_tax numeric(14,2) not null default 0,
  price_avg numeric(14,2),
  ingestion_run_id uuid,
  created_at timestamptz not null default now(),
  unique (org_id, store_id, product_id, sale_date)
);

create index if not exists idx_sales_org_date on sales(org_id, sale_date desc);
create index if not exists idx_sales_period on sales(org_id, period_code);
create index if not exists idx_sales_product_date on sales(product_id, sale_date desc);

create table if not exists purchase_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  po_number text not null,
  order_date date not null,
  expected_delivery_date date,
  status text not null default 'pending' check (status in ('pending', 'partial', 'fulfilled', 'cancelled')),
  total_units_ordered numeric(14,2),
  total_units_received numeric(14,2),
  total_value numeric(14,2),
  ingestion_run_id uuid,
  created_at timestamptz not null default now(),
  unique (org_id, chain_id, po_number)
);

create index if not exists idx_po_org_date on purchase_orders(org_id, order_date desc);
create index if not exists idx_po_status on purchase_orders(org_id, status);

create table if not exists purchase_order_lines (
  id bigserial primary key,
  po_id uuid not null references purchase_orders(id) on delete cascade,
  store_id uuid references stores(id),
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

create index if not exists idx_pol_po on purchase_order_lines(po_id);
create index if not exists idx_pol_product on purchase_order_lines(product_id);
create index if not exists idx_pol_store on purchase_order_lines(store_id);

-- ────────────────────────────────────────────────────────────
-- Capa 5: Derivada
-- ────────────────────────────────────────────────────────────
create table if not exists suggested_orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  generated_at timestamptz not null default now(),
  for_period text,
  suggested_units numeric(14,2) not null,
  suggested_cases int,
  suggested_pallets int,
  current_inventory numeric(14,2),
  current_ddi numeric(8,2),
  velocity_daily numeric(10,4),
  reason_code text not null check (reason_code in ('low_ddi', 'velocity_up', 'stockout_risk', 'periodic_replenish', 'multi_flavor_restock')),
  reason_detail text,
  estimated_lost_sale numeric(14,2),
  confidence numeric(3,2) check (confidence >= 0 and confidence <= 1),
  status text not null default 'new' check (status in ('new', 'sent', 'fulfilled', 'ignored')),
  notes text
);

create index if not exists idx_sugg_org_status on suggested_orders(org_id, status, generated_at desc);
create index if not exists idx_sugg_org_period on suggested_orders(org_id, for_period);

create table if not exists stockout_alerts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  store_id uuid not null references stores(id),
  product_id uuid not null references products(id),
  alert_date date not null,
  severity text not null check (severity in ('critical', 'high', 'medium')),
  days_in_stockout int,
  lost_sale_estimate numeric(14,2),
  resolved boolean not null default false,
  resolved_at timestamptz,
  unique (org_id, store_id, product_id, alert_date)
);

create index if not exists idx_alerts_org_active on stockout_alerts(org_id, resolved, alert_date desc);

create table if not exists daily_kpis (
  id bigserial primary key,
  org_id uuid not null references organizations(id) on delete cascade,
  chain_id uuid not null references chains(id),
  kpi_date date not null,
  total_inventory_value numeric(14,2),
  total_stockouts int,
  total_lost_sale_estimate numeric(14,2),
  avg_fill_rate numeric(5,2),
  total_active_pos int,
  metadata jsonb,
  unique (org_id, chain_id, kpi_date)
);

create index if not exists idx_kpis_org_date on daily_kpis(org_id, kpi_date desc);

-- ────────────────────────────────────────────────────────────
-- Capa 6: Operativa
-- ────────────────────────────────────────────────────────────
create table if not exists ingestion_runs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references organizations(id),
  chain_id uuid not null references chains(id),
  data_type text not null check (data_type in ('inventory', 'sales', 'po', 'catalog')),
  source_file text,
  started_at timestamptz not null default now(),
  finished_at timestamptz,
  status text not null default 'running' check (status in ('running', 'success', 'failed')),
  rows_inserted int default 0,
  rows_updated int default 0,
  rows_skipped int default 0,
  error_message text,
  triggered_by uuid references users(id)
);

create index if not exists idx_ingestion_org on ingestion_runs(org_id, started_at desc);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

-- Helper: extraer org_id del usuario actual
create or replace function auth_org_id() returns uuid as $$
  select org_id from users where id = auth.uid();
$$ language sql stable security definer;

-- Tablas globales: lectura para autenticados, escritura solo service_role
alter table chains enable row level security;
alter table chain_calendars enable row level security;

create policy "auth_select_chains" on chains for select using (auth.role() = 'authenticated');
create policy "auth_select_calendars" on chain_calendars for select using (auth.role() = 'authenticated');

-- Tablas por org: usuarios solo ven su org
alter table organizations enable row level security;
create policy "users_see_own_org" on organizations for select using (id = auth_org_id());

alter table users enable row level security;
create policy "users_see_own_team" on users for select using (org_id = auth_org_id());

alter table org_chain_access enable row level security;
create policy "users_see_own_org_access" on org_chain_access for select using (org_id = auth_org_id());

alter table products enable row level security;
create policy "users_see_own_products" on products for select using (org_id = auth_org_id());

alter table product_packaging enable row level security;
create policy "users_see_own_packaging" on product_packaging for select using (
  product_id in (select id from products where org_id = auth_org_id())
);

alter table stores enable row level security;
create policy "users_see_own_stores" on stores for select using (org_id = auth_org_id());

alter table inventory_snapshots enable row level security;
create policy "users_see_own_inventory" on inventory_snapshots for select using (org_id = auth_org_id());

alter table sales enable row level security;
create policy "users_see_own_sales" on sales for select using (org_id = auth_org_id());

alter table purchase_orders enable row level security;
create policy "users_see_own_pos" on purchase_orders for select using (org_id = auth_org_id());

alter table purchase_order_lines enable row level security;
create policy "users_see_own_pol" on purchase_order_lines for select using (
  po_id in (select id from purchase_orders where org_id = auth_org_id())
);

alter table suggested_orders enable row level security;
create policy "users_see_own_suggestions" on suggested_orders for all using (org_id = auth_org_id());

alter table stockout_alerts enable row level security;
create policy "users_see_own_alerts" on stockout_alerts for all using (org_id = auth_org_id());

alter table daily_kpis enable row level security;
create policy "users_see_own_kpis" on daily_kpis for select using (org_id = auth_org_id());

alter table ingestion_runs enable row level security;
create policy "users_see_own_runs" on ingestion_runs for select using (org_id = auth_org_id());

-- ============================================================
-- FIN schema v1
-- ============================================================
