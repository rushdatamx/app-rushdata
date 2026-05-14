-- ============================================================
-- PORTAL — KPI functions (extraídas de Supabase 2026-05-14)
-- ============================================================
--
-- Estas funciones se crearon directamente en Supabase durante el
-- desarrollo inicial y vivieron fuera del repo hasta hoy. Las agregamos
-- aquí versionadas. Si se aplica este archivo en un proyecto Supabase
-- nuevo, hay que correrlo DESPUÉS de 03_functions.sql.
--
-- IMPORTANTE: el archivo 05_kpi_functions_ranged.sql sobreescribe estas
-- versiones con variantes que aceptan rangos de fecha. Mantenemos este
-- archivo como referencia histórica + para reproducir el estado pre-F4.

-- ────────────────────────────────────────────────────────────
-- fn_po_monthly(p_org_id)
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_po_monthly(p_org_id uuid)
returns table (
  month_start date,
  po_count int,
  units_ordered numeric,
  units_received numeric,
  value numeric
)
language sql
stable
as $$
  select date_trunc('month', order_date)::date as month_start,
         count(*)::int as po_count,
         coalesce(sum(total_units_ordered), 0) as units_ordered,
         coalesce(sum(total_units_received), 0) as units_received,
         coalesce(sum(total_value), 0) as value
  from purchase_orders
  where org_id = p_org_id
  group by 1
  order by 1;
$$;

-- ────────────────────────────────────────────────────────────
-- fn_po_top_products(p_org_id, p_limit)
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_po_top_products(p_org_id uuid, p_limit int default 10)
returns table (
  product_id uuid,
  product_name text,
  product_category text,
  po_count int,
  units numeric,
  value numeric
)
language sql
stable
as $$
  select pol.product_id,
         p.name,
         p.category,
         count(distinct pol.po_id)::int as po_count,
         coalesce(sum(pol.units_ordered), 0) as units,
         coalesce(sum(pol.units_ordered * p.unit_price), 0) as value
  from purchase_order_lines pol
  join purchase_orders po on po.id = pol.po_id
  join products p on p.id = pol.product_id
  where po.org_id = p_org_id
  group by pol.product_id, p.name, p.category
  order by value desc
  limit p_limit;
$$;

-- ────────────────────────────────────────────────────────────
-- fn_po_top_stores(p_org_id, p_limit)
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_po_top_stores(p_org_id uuid, p_limit int default 8)
returns table (
  store_id uuid,
  store_name text,
  store_cluster text,
  po_count int,
  units numeric,
  value numeric
)
language sql
stable
as $$
  select pol.store_id,
         st.name,
         st.cluster,
         count(distinct pol.po_id)::int as po_count,
         coalesce(sum(pol.units_ordered), 0) as units,
         coalesce(sum(pol.units_ordered * p.unit_price), 0) as value
  from purchase_order_lines pol
  join purchase_orders po on po.id = pol.po_id
  join stores st on st.id = pol.store_id
  join products p on p.id = pol.product_id
  where po.org_id = p_org_id
  group by pol.store_id, st.name, st.cluster
  order by value desc
  limit p_limit;
$$;

-- ────────────────────────────────────────────────────────────
-- fn_product_kpis(p_org_id)
-- Ventana de ventas: últimos 30 días desde max(sale_date) — NO desde current_date.
-- Esto es intencional para que la demo con datos mock no "se vacíe" con el tiempo.
-- Métricas de estado (inventario, stockouts) son siempre "ahora".
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_product_kpis(p_org_id uuid)
returns table (
  product_id uuid,
  stores_with_inventory int,
  stores_with_stockout int,
  inventory_units numeric,
  units_last_30d numeric,
  revenue_last_30d numeric
)
language sql
stable
as $$
  with inv as (
    select product_id,
           count(distinct store_id) filter (where current_inventory > 0)::int as stores_with_inventory,
           coalesce(sum(current_inventory),0) as inventory_units
    from vw_latest_inventory
    where org_id = p_org_id
    group by product_id
  ),
  outs as (
    select product_id, count(distinct store_id)::int as stores_with_stockout
    from stockout_alerts
    where org_id = p_org_id and resolved = false
    group by product_id
  ),
  sales30 as (
    select s.product_id,
           coalesce(sum(s.units),0) as units_30d,
           coalesce(sum(s.revenue_no_tax),0) as revenue_30d
    from sales s
    where s.org_id = p_org_id
      and s.sale_date >= (select max(sale_date) from sales where org_id = p_org_id) - interval '30 days'
    group by s.product_id
  )
  select
    coalesce(inv.product_id, outs.product_id, sales30.product_id) as product_id,
    coalesce(inv.stores_with_inventory, 0),
    coalesce(outs.stores_with_stockout, 0),
    coalesce(inv.inventory_units, 0),
    coalesce(sales30.units_30d, 0),
    coalesce(sales30.revenue_30d, 0)
  from inv
  full outer join outs on outs.product_id = inv.product_id
  full outer join sales30 on sales30.product_id = coalesce(inv.product_id, outs.product_id);
$$;

-- ────────────────────────────────────────────────────────────
-- fn_product_weekly_sales(p_org_id, p_weeks)
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_product_weekly_sales(p_org_id uuid, p_weeks int default 8)
returns table (
  product_id uuid,
  week_start date,
  units numeric,
  revenue numeric
)
language sql
stable
as $$
  with max_d as (select max(sale_date) as d from sales where org_id = p_org_id),
       start_d as (select (d - ((p_weeks - 1) * 7))::date as d from max_d)
  select s.product_id,
         date_trunc('week', s.sale_date)::date as week_start,
         coalesce(sum(s.units), 0) as units,
         coalesce(sum(s.revenue_no_tax), 0) as revenue
  from sales s, start_d
  where s.org_id = p_org_id
    and s.sale_date >= start_d.d
  group by s.product_id, date_trunc('week', s.sale_date)
  order by s.product_id, week_start;
$$;

-- ────────────────────────────────────────────────────────────
-- fn_store_kpis(p_org_id)
-- Misma lógica que fn_product_kpis: ventas relativas a max(sale_date),
-- inventario y stockouts "ahora".
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_store_kpis(p_org_id uuid)
returns table (
  store_id uuid,
  skus_active int,
  skus_with_stock int,
  total_inventory_units numeric,
  total_inventory_value_cost numeric,
  active_stockouts int,
  units_last_30d numeric,
  revenue_last_30d numeric
)
language sql
stable
as $$
  with inv as (
    select store_id,
           count(distinct product_id) filter (where current_inventory > 0)::int as skus_with_stock,
           count(distinct product_id)::int as skus_active,
           coalesce(sum(current_inventory),0) as total_inventory_units,
           coalesce(sum(value_at_cost),0) as total_inventory_value_cost
    from vw_latest_inventory
    where org_id = p_org_id
    group by store_id
  ),
  alerts as (
    select store_id, count(*)::int as active_stockouts
    from stockout_alerts
    where org_id = p_org_id and resolved = false
    group by store_id
  ),
  sales30 as (
    select s.store_id,
           coalesce(sum(s.units),0) as units_30d,
           coalesce(sum(s.revenue_no_tax),0) as revenue_30d
    from sales s
    where s.org_id = p_org_id
      and s.sale_date >= (select max(sale_date) from sales where org_id = p_org_id) - interval '30 days'
    group by s.store_id
  )
  select
    coalesce(inv.store_id, alerts.store_id, sales30.store_id) as store_id,
    coalesce(inv.skus_active, 0),
    coalesce(inv.skus_with_stock, 0),
    coalesce(inv.total_inventory_units, 0),
    coalesce(inv.total_inventory_value_cost, 0),
    coalesce(alerts.active_stockouts, 0),
    coalesce(sales30.units_30d, 0),
    coalesce(sales30.revenue_30d, 0)
  from inv
  full outer join alerts on alerts.store_id = inv.store_id
  full outer join sales30 on sales30.store_id = coalesce(inv.store_id, alerts.store_id);
$$;
