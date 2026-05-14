-- ============================================================
-- PORTAL — Forecast aggregation helpers
-- ============================================================
--
-- Mueven la agregación de ventas a Postgres para que el frontend no
-- tenga que traer N filas crudas (~80k para una org demo) y agregarlas
-- en memoria. Antes el cliente recibía solo 1000 filas (cap default de
-- Supabase) y la Forecast se veía en $0.

-- ────────────────────────────────────────────────────────────
-- fn_sales_daily_series(p_org_id, p_start, p_end)
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_sales_daily_series(
  p_org_id uuid,
  p_start date,
  p_end date
)
returns table (
  sale_date date,
  units numeric,
  revenue numeric
)
language sql
stable
as $$
  select
    sale_date,
    sum(units)          as units,
    sum(revenue_no_tax) as revenue
  from sales
  where org_id = p_org_id
    and sale_date >= p_start
    and sale_date <= p_end
  group by sale_date
  order by sale_date;
$$;

-- ────────────────────────────────────────────────────────────
-- fn_sales_product_daily(p_org_id, p_start, p_end)
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_sales_product_daily(
  p_org_id uuid,
  p_start date,
  p_end date
)
returns table (
  product_id uuid,
  sale_date date,
  units numeric
)
language sql
stable
as $$
  select
    product_id,
    sale_date,
    sum(units) as units
  from sales
  where org_id = p_org_id
    and sale_date >= p_start
    and sale_date <= p_end
  group by product_id, sale_date;
$$;
