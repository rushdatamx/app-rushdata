-- ============================================================
-- PORTAL — Vistas auxiliares para el motor de sugeridos
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- vw_latest_inventory
-- Último snapshot por (org, store, product)
-- ────────────────────────────────────────────────────────────
create or replace view vw_latest_inventory as
select distinct on (org_id, store_id, product_id)
  org_id, chain_id, store_id, product_id,
  snapshot_date,
  units as current_inventory,
  value_at_cost, value_at_retail
from inventory_snapshots
order by org_id, store_id, product_id, snapshot_date desc;

-- ────────────────────────────────────────────────────────────
-- vw_velocity_28d
-- Venta promedio diaria últimos 28 días + días con venta
-- ────────────────────────────────────────────────────────────
create or replace view vw_velocity_28d as
with last_date as (
  select org_id, max(sale_date) as max_date
  from sales group by org_id
),
window_sales as (
  select s.org_id, s.chain_id, s.store_id, s.product_id,
         s.sale_date, s.units
  from sales s
  join last_date l on l.org_id = s.org_id
  where s.sale_date > (l.max_date - interval '28 days')
)
select
  org_id, chain_id, store_id, product_id,
  round((sum(units) / 28.0)::numeric, 4) as velocity_daily,
  count(distinct sale_date) as days_with_sales,
  sum(units) as units_last_28d,
  stddev_samp(units) as daily_stddev,
  avg(units) as daily_avg
from window_sales
group by org_id, chain_id, store_id, product_id;

-- ────────────────────────────────────────────────────────────
-- vw_velocity_7d (para detectar velocity_up)
-- ────────────────────────────────────────────────────────────
create or replace view vw_velocity_7d as
with last_date as (
  select org_id, max(sale_date) as max_date from sales group by org_id
)
select
  s.org_id, s.store_id, s.product_id,
  round((sum(s.units) / 7.0)::numeric, 4) as velocity_7d
from sales s
join last_date l on l.org_id = s.org_id
where s.sale_date > (l.max_date - interval '7 days')
group by s.org_id, s.store_id, s.product_id;

-- ────────────────────────────────────────────────────────────
-- vw_active_pos_pending
-- Unidades pendientes por OC por (store, product)
-- ────────────────────────────────────────────────────────────
create or replace view vw_active_pos_pending as
select
  po.org_id, po.chain_id,
  pol.store_id, pol.product_id,
  sum(pol.units_pending) as units_in_transit,
  count(distinct po.id) as active_pos_count
from purchase_orders po
join purchase_order_lines pol on pol.po_id = po.id
where po.status in ('pending', 'partial')
  and pol.units_pending > 0
  and pol.store_id is not null
group by po.org_id, po.chain_id, pol.store_id, pol.product_id;

-- ────────────────────────────────────────────────────────────
-- vw_inventory_with_velocity (DDI + contexto)
-- Combina inventario actual + velocity + OCs en tránsito
-- Base para el motor
-- ────────────────────────────────────────────────────────────
create or replace view vw_inventory_with_velocity as
select
  i.org_id, i.chain_id, i.store_id, i.product_id,
  i.snapshot_date as inventory_date,
  i.current_inventory,
  i.value_at_cost, i.value_at_retail,
  coalesce(v.velocity_daily, 0) as velocity_daily,
  coalesce(v.days_with_sales, 0) as days_with_sales,
  coalesce(v.daily_stddev, 0) as daily_stddev,
  coalesce(v.daily_avg, 0) as daily_avg,
  coalesce(v7.velocity_7d, 0) as velocity_7d,
  coalesce(p.units_in_transit, 0) as units_in_transit,
  case
    when coalesce(v.velocity_daily, 0) = 0 then null
    when i.current_inventory = 0 then 0
    else round((i.current_inventory / v.velocity_daily)::numeric, 2)
  end as days_of_inventory
from vw_latest_inventory i
left join vw_velocity_28d v
  on v.org_id = i.org_id and v.store_id = i.store_id and v.product_id = i.product_id
left join vw_velocity_7d v7
  on v7.org_id = i.org_id and v7.store_id = i.store_id and v7.product_id = i.product_id
left join vw_active_pos_pending p
  on p.org_id = i.org_id and p.store_id = i.store_id and p.product_id = i.product_id;

-- ────────────────────────────────────────────────────────────
-- vw_active_stockouts
-- Combinaciones (store, product) con DDI = 0 o inventario = 0 con velocity > 0
-- ────────────────────────────────────────────────────────────
create or replace view vw_active_stockouts as
select
  iv.org_id, iv.chain_id, iv.store_id, iv.product_id,
  iv.inventory_date,
  iv.current_inventory,
  iv.velocity_daily
from vw_inventory_with_velocity iv
join stores s on s.id = iv.store_id
where iv.current_inventory = 0
  and iv.velocity_daily > 0
  and s.is_cedis = false
  and s.active = true;
