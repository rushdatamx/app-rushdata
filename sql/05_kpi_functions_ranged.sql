-- ============================================================
-- PORTAL — KPI functions con rango de fecha opcional (F4)
-- ============================================================
--
-- Reemplaza fn_product_kpis y fn_store_kpis con versiones que aceptan
-- (p_start, p_end) como parámetros opcionales. Cuando vienen NULL, la
-- ventana sigue siendo "últimos 30 días desde max(sale_date)" — compat
-- 100% con el código TS actual.
--
-- Cuando vienen ambos:
--   - Métricas de ventas (units, revenue) usan la ventana provista
--   - Métricas de estado (inventario, stockouts) SIEMPRE son "ahora"
--     (no son métricas históricas snapshot por período; eso requeriría
--     reescribir cómo viven los stockouts en BD)
--
-- También cambiamos los nombres de las columnas de salida a algo más
-- genérico: units_in_window / revenue_in_window. El frontend mapea esto
-- a "units_last_30d" si no se pasó rango (para mantener tipos existentes).
--
-- Aplicar DESPUÉS de 04_kpi_functions.sql (drop+create reemplaza).

-- ────────────────────────────────────────────────────────────
-- fn_product_kpis(p_org_id, p_start, p_end)
-- ────────────────────────────────────────────────────────────
-- Drop primero porque la signatura cambia el nombre de columnas
drop function if exists public.fn_product_kpis(uuid);

create or replace function public.fn_product_kpis(
  p_org_id uuid,
  p_start date default null,
  p_end date default null
)
returns table (
  product_id uuid,
  stores_with_inventory int,
  stores_with_stockout int,
  inventory_units numeric,
  units_in_window numeric,
  revenue_in_window numeric
)
language sql
stable
as $$
  with bounds as (
    select
      coalesce(
        p_start,
        (select max(sale_date) - interval '30 days' from sales where org_id = p_org_id)::date
      ) as start_d,
      coalesce(
        p_end,
        (select max(sale_date) from sales where org_id = p_org_id)::date
      ) as end_d
  ),
  inv as (
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
  sales_win as (
    select s.product_id,
           coalesce(sum(s.units),0) as units_w,
           coalesce(sum(s.revenue_no_tax),0) as revenue_w
    from sales s, bounds b
    where s.org_id = p_org_id
      and s.sale_date >= b.start_d
      and s.sale_date <= b.end_d
    group by s.product_id
  )
  select
    coalesce(inv.product_id, outs.product_id, sales_win.product_id) as product_id,
    coalesce(inv.stores_with_inventory, 0),
    coalesce(outs.stores_with_stockout, 0),
    coalesce(inv.inventory_units, 0),
    coalesce(sales_win.units_w, 0),
    coalesce(sales_win.revenue_w, 0)
  from inv
  full outer join outs on outs.product_id = inv.product_id
  full outer join sales_win on sales_win.product_id = coalesce(inv.product_id, outs.product_id);
$$;

-- ────────────────────────────────────────────────────────────
-- fn_store_kpis(p_org_id, p_start, p_end)
-- ────────────────────────────────────────────────────────────
drop function if exists public.fn_store_kpis(uuid);

create or replace function public.fn_store_kpis(
  p_org_id uuid,
  p_start date default null,
  p_end date default null
)
returns table (
  store_id uuid,
  skus_active int,
  skus_with_stock int,
  total_inventory_units numeric,
  total_inventory_value_cost numeric,
  active_stockouts int,
  units_in_window numeric,
  revenue_in_window numeric
)
language sql
stable
as $$
  with bounds as (
    select
      coalesce(
        p_start,
        (select max(sale_date) - interval '30 days' from sales where org_id = p_org_id)::date
      ) as start_d,
      coalesce(
        p_end,
        (select max(sale_date) from sales where org_id = p_org_id)::date
      ) as end_d
  ),
  inv as (
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
  sales_win as (
    select s.store_id,
           coalesce(sum(s.units),0) as units_w,
           coalesce(sum(s.revenue_no_tax),0) as revenue_w
    from sales s, bounds b
    where s.org_id = p_org_id
      and s.sale_date >= b.start_d
      and s.sale_date <= b.end_d
    group by s.store_id
  )
  select
    coalesce(inv.store_id, alerts.store_id, sales_win.store_id) as store_id,
    coalesce(inv.skus_active, 0),
    coalesce(inv.skus_with_stock, 0),
    coalesce(inv.total_inventory_units, 0),
    coalesce(inv.total_inventory_value_cost, 0),
    coalesce(alerts.active_stockouts, 0),
    coalesce(sales_win.units_w, 0),
    coalesce(sales_win.revenue_w, 0)
  from inv
  full outer join alerts on alerts.store_id = inv.store_id
  full outer join sales_win on sales_win.store_id = coalesce(inv.store_id, alerts.store_id);
$$;

-- ────────────────────────────────────────────────────────────
-- fn_product_weekly_sales(p_org_id, p_weeks, p_end)
-- Mismo nombre, ahora con p_end opcional (último día de la ventana
-- semanal). Default = max(sale_date).
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_product_weekly_sales(
  p_org_id uuid,
  p_weeks int default 8,
  p_end date default null
)
returns table (
  product_id uuid,
  week_start date,
  units numeric,
  revenue numeric
)
language sql
stable
as $$
  with max_d as (
    select coalesce(
      p_end,
      (select max(sale_date) from sales where org_id = p_org_id)
    )::date as d
  ),
  start_d as (select (d - ((p_weeks - 1) * 7))::date as d from max_d)
  select s.product_id,
         date_trunc('week', s.sale_date)::date as week_start,
         coalesce(sum(s.units), 0) as units,
         coalesce(sum(s.revenue_no_tax), 0) as revenue
  from sales s, start_d, max_d
  where s.org_id = p_org_id
    and s.sale_date >= start_d.d
    and s.sale_date <= max_d.d
  group by s.product_id, date_trunc('week', s.sale_date)
  order by s.product_id, week_start;
$$;
