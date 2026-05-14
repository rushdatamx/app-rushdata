-- ============================================================
-- PORTAL — Sales business view (Home rediseño)
-- ============================================================
--
-- Tres funciones para la nueva Home "vista de negocio":
--   1. fn_sales_monthly_yoy  → 12 meses de revenue actual vs M-12
--   2. fn_sales_top_products → top N productos por revenue (últimos N meses)
--   3. fn_sales_top_stores   → top N tiendas por revenue (últimos N meses, excluye CEDIS)
--
-- Ancla: max(sale_date) del org (mismo criterio que el resto de la app).
-- RLS: filtro explícito por p_org_id (mismo patrón que fn_po_*).

-- ────────────────────────────────────────────────────────────
-- fn_sales_monthly_yoy(p_org_id)
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_sales_monthly_yoy(p_org_id uuid)
returns table (
  month_start date,
  revenue_current numeric,
  revenue_previous numeric,
  units_current numeric,
  units_previous numeric
)
language sql
stable
as $$
  with anchor as (
    select date_trunc('month', max(sale_date))::date as anchor_month
    from sales
    where org_id = p_org_id
  ),
  months as (
    select generate_series(
      (select anchor_month from anchor) - interval '11 months',
      (select anchor_month from anchor),
      interval '1 month'
    )::date as month_start
  ),
  agg as (
    select
      date_trunc('month', sale_date)::date as month_start,
      sum(revenue_no_tax) as revenue,
      sum(units) as units
    from sales
    where org_id = p_org_id
      and sale_date >= ((select anchor_month from anchor) - interval '23 months')::date
    group by 1
  )
  select
    m.month_start,
    coalesce(cur.revenue, 0)  as revenue_current,
    coalesce(prev.revenue, 0) as revenue_previous,
    coalesce(cur.units, 0)    as units_current,
    coalesce(prev.units, 0)   as units_previous
  from months m
  left join agg cur  on cur.month_start  = m.month_start
  left join agg prev on prev.month_start = (m.month_start - interval '12 months')::date
  order by m.month_start;
$$;

-- ────────────────────────────────────────────────────────────
-- fn_sales_top_products(p_org_id, p_months, p_limit)
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_sales_top_products(
  p_org_id uuid,
  p_months int default 12,
  p_limit int default 10
)
returns table (
  product_id uuid,
  product_name text,
  product_upc text,
  product_category text,
  units numeric,
  revenue numeric
)
language sql
stable
as $$
  with anchor as (
    select max(sale_date) as anchor_date from sales where org_id = p_org_id
  ),
  bounds as (
    select
      (date_trunc('month', anchor_date) - make_interval(months => p_months - 1))::date as start_date,
      anchor_date as end_date
    from anchor
  )
  select
    p.id,
    p.name,
    p.upc,
    p.category,
    coalesce(sum(s.units), 0)          as units,
    coalesce(sum(s.revenue_no_tax), 0) as revenue
  from sales s
  join products p on p.id = s.product_id
  cross join bounds b
  where s.org_id = p_org_id
    and s.sale_date >= b.start_date
    and s.sale_date <= b.end_date
  group by p.id, p.name, p.upc, p.category
  order by revenue desc nulls last
  limit p_limit;
$$;

-- ────────────────────────────────────────────────────────────
-- fn_sales_top_stores(p_org_id, p_months, p_limit)
-- Excluye CEDIS — sell-out se mide en tienda.
-- ────────────────────────────────────────────────────────────
create or replace function public.fn_sales_top_stores(
  p_org_id uuid,
  p_months int default 12,
  p_limit int default 10
)
returns table (
  store_id uuid,
  store_name text,
  store_code text,
  store_region text,
  units numeric,
  revenue numeric
)
language sql
stable
as $$
  with anchor as (
    select max(sale_date) as anchor_date from sales where org_id = p_org_id
  ),
  bounds as (
    select
      (date_trunc('month', anchor_date) - make_interval(months => p_months - 1))::date as start_date,
      anchor_date as end_date
    from anchor
  )
  select
    st.id,
    st.name,
    st.external_code,
    st.region,
    coalesce(sum(s.units), 0)          as units,
    coalesce(sum(s.revenue_no_tax), 0) as revenue
  from sales s
  join stores st on st.id = s.store_id
  cross join bounds b
  where s.org_id = p_org_id
    and st.is_cedis = false
    and s.sale_date >= b.start_date
    and s.sale_date <= b.end_date
  group by st.id, st.name, st.external_code, st.region
  order by revenue desc nulls last
  limit p_limit;
$$;
