-- ============================================================
-- PORTAL — Sales pivot YoY (sub-tab "Detalle" de /tiendas y /productos)
-- ============================================================
--
-- Una sola función paramétrica para evitar duplicar lógica entre vistas.
-- Devuelve una fila por grupo con totales del período actual + período
-- anterior (mismo rango hace 1 año) + delta %.
--
-- group_by: 'store' | 'product' | 'region' | 'category' | 'month'
-- Filtros opcionales: store_id, product_id, region, category.

create or replace function public.fn_sales_pivot_yoy(
  p_org_id uuid,
  p_start date,
  p_end date,
  p_group_by text,
  p_store_id uuid default null,
  p_product_id uuid default null,
  p_region text default null,
  p_category text default null
)
returns table (
  group_key text,
  group_label text,
  units_current numeric,
  units_previous numeric,
  revenue_current numeric,
  revenue_previous numeric,
  units_delta_pct numeric,
  revenue_delta_pct numeric
)
language sql stable as $$
  with bounds as (
    select
      p_start as cur_start,
      p_end   as cur_end,
      (p_start - interval '1 year')::date as prev_start,
      (p_end   - interval '1 year')::date as prev_end
  ),
  base as (
    select
      s.*, st.name as store_name, st.region, p.name as product_name, p.category,
      case
        when s.sale_date between (select cur_start from bounds) and (select cur_end from bounds)
          then 'current' else 'previous'
      end as bucket,
      -- Para group_by='month': normalizar al mes-current.
      -- Si la fila es previous, sumarle 12 meses para que mapee a su mes-current homólogo.
      case
        when s.sale_date between (select cur_start from bounds) and (select cur_end from bounds)
          then date_trunc('month', s.sale_date)::date
        else (date_trunc('month', s.sale_date) + interval '12 months')::date
      end as month_normalized
    from sales s
    join stores st on st.id = s.store_id
    join products p on p.id = s.product_id
    where s.org_id = p_org_id
      and st.is_cedis = false
      and (p_store_id   is null or s.store_id   = p_store_id)
      and (p_product_id is null or s.product_id = p_product_id)
      and (p_region     is null or st.region    = p_region)
      and (p_category   is null or p.category   = p_category)
      and (
        (s.sale_date between (select cur_start from bounds) and (select cur_end from bounds))
        or
        (s.sale_date between (select prev_start from bounds) and (select prev_end from bounds))
      )
  ),
  tagged as (
    select
      case
        when p_group_by = 'store'    then store_id::text
        when p_group_by = 'product'  then product_id::text
        when p_group_by = 'region'   then coalesce(region, '—')
        when p_group_by = 'category' then coalesce(category, '—')
        when p_group_by = 'month'    then to_char(month_normalized, 'YYYY-MM-01')
      end as group_key,
      case
        when p_group_by = 'store'    then store_name
        when p_group_by = 'product'  then product_name
        when p_group_by = 'region'   then coalesce(region, '—')
        when p_group_by = 'category' then coalesce(category, '—')
        when p_group_by = 'month'    then to_char(month_normalized, 'YYYY-MM-01')
      end as group_label,
      bucket,
      units,
      revenue_no_tax
    from base
  ),
  agg as (
    select
      group_key,
      max(group_label) as group_label,
      sum(units)          filter (where bucket = 'current')  as units_current,
      sum(units)          filter (where bucket = 'previous') as units_previous,
      sum(revenue_no_tax) filter (where bucket = 'current')  as revenue_current,
      sum(revenue_no_tax) filter (where bucket = 'previous') as revenue_previous
    from tagged
    group by group_key
  )
  select
    group_key,
    group_label,
    coalesce(units_current, 0)    as units_current,
    coalesce(units_previous, 0)   as units_previous,
    coalesce(revenue_current, 0)  as revenue_current,
    coalesce(revenue_previous, 0) as revenue_previous,
    case when units_previous > 0
      then ((units_current - units_previous) / units_previous) * 100 end as units_delta_pct,
    case when revenue_previous > 0
      then ((revenue_current - revenue_previous) / revenue_previous) * 100 end as revenue_delta_pct
  from agg
  order by
    case when p_group_by = 'month' then group_key end asc nulls last,
    revenue_current desc nulls last;
$$;
