-- ============================================================
-- PORTAL — Motor de sugeridos v1
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- fn_cover_target_days
-- Días objetivo de cobertura por categoría
-- ────────────────────────────────────────────────────────────
create or replace function fn_cover_target_days(p_category text)
returns int as $$
  select case
    when p_category = 'sazonadores' then 21  -- 3 semanas
    when p_category = 'carne_seca' then 14   -- 2 semanas (premium, alto valor)
    else 14
  end;
$$ language sql immutable;

-- ────────────────────────────────────────────────────────────
-- fn_compute_stockouts(p_org_id)
-- Detecta stockouts activos y los inserta en stockout_alerts
-- ────────────────────────────────────────────────────────────
create or replace function fn_compute_stockouts(p_org_id uuid)
returns int as $$
declare
  inserted_count int := 0;
begin
  -- Marcar resueltos los stockouts cuya tienda × producto YA NO está en quiebre
  update stockout_alerts sa
  set resolved = true, resolved_at = now()
  where sa.org_id = p_org_id
    and sa.resolved = false
    and not exists (
      select 1 from vw_active_stockouts a
      where a.org_id = sa.org_id
        and a.store_id = sa.store_id
        and a.product_id = sa.product_id
    );

  -- Insertar nuevos stockouts
  with new_alerts as (
    select
      a.org_id, a.chain_id, a.store_id, a.product_id,
      current_date as alert_date,
      case
        when a.velocity_daily >= 5 then 'critical'
        when a.velocity_daily >= 2 then 'high'
        else 'medium'
      end as severity,
      0 as days_in_stockout, -- estimación inicial; mejora con histórico
      round((a.velocity_daily * 7 * p.unit_price)::numeric, 2) as lost_sale_estimate
    from vw_active_stockouts a
    join products p on p.id = a.product_id
    where a.org_id = p_org_id
  )
  insert into stockout_alerts (
    org_id, chain_id, store_id, product_id, alert_date,
    severity, days_in_stockout, lost_sale_estimate
  )
  select * from new_alerts
  on conflict (org_id, store_id, product_id, alert_date) do nothing;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$ language plpgsql;

-- ────────────────────────────────────────────────────────────
-- fn_compute_suggestions(p_org_id)
-- Calcula sugeridos para todas las (store × product) de la org
-- ────────────────────────────────────────────────────────────
create or replace function fn_compute_suggestions(p_org_id uuid)
returns int as $$
declare
  inserted_count int := 0;
begin
  -- Borrar sugeridos previos con status='new' del día (re-ejecución idempotente)
  delete from suggested_orders
  where org_id = p_org_id
    and status = 'new'
    and generated_at::date = current_date;

  -- Cálculo principal
  with base as (
    select
      iv.org_id, iv.chain_id, iv.store_id, iv.product_id,
      iv.current_inventory, iv.velocity_daily, iv.velocity_7d,
      iv.units_in_transit, iv.days_of_inventory, iv.days_with_sales,
      iv.daily_stddev, iv.daily_avg,
      p.unit_price, p.category, p.subcategory,
      pp.units_per_case, pp.order_multiple, pp.min_order_units, pp.cases_per_pallet,
      fn_cover_target_days(p.category) as cover_target_days,
      s.is_cedis, s.active as store_active, p.active as product_active
    from vw_inventory_with_velocity iv
    join products p on p.id = iv.product_id
    join stores s on s.id = iv.store_id
    left join product_packaging pp on pp.product_id = p.id and pp.chain_id = iv.chain_id
    where iv.org_id = p_org_id
  ),
  filtered as (
    select * from base
    where not is_cedis           -- no sugerir para CEDIS
      and store_active = true
      and product_active = true
      and velocity_daily > 0     -- sin venta = sin sugerido
  ),
  raw_calc as (
    select
      *,
      greatest(0,
        (velocity_daily * cover_target_days)
        - current_inventory
        + 0  -- no restamos in_transit porque ya está en 0 (acordamos 100% recibido)
      ) as raw_units
    from filtered
  ),
  rounded as (
    select
      *,
      -- Redondear a múltiplo de caja
      case
        when raw_units = 0 then 0
        when units_per_case is null then ceil(raw_units)
        else ceil(raw_units / units_per_case) * units_per_case
      end as suggested_units_raw
    from raw_calc
  ),
  final_calc as (
    select
      *,
      -- Aplicar min_order_units si aplica
      case
        when suggested_units_raw > 0
          and min_order_units is not null
          and suggested_units_raw < min_order_units
          then min_order_units
        else suggested_units_raw
      end as final_units
    from rounded
  ),
  with_reason as (
    select
      *,
      case
        when days_of_inventory is not null and days_of_inventory < 7 then 'stockout_risk'
        when days_of_inventory is not null and days_of_inventory < (cover_target_days * 0.5) then 'low_ddi'
        when velocity_7d > velocity_28d_calc * 1.5 and velocity_28d_calc > 0 then 'velocity_up'
        else 'periodic_replenish'
      end as reason_code,
      -- confidence
      least(1.0,
        (days_with_sales::numeric / 28.0)
        * case
            when daily_avg > 0 and daily_stddev is not null then
              1 - least(0.5, daily_stddev::numeric / daily_avg::numeric)
            else 1.0
          end
      )::numeric(3,2) as confidence_score,
      -- venta perdida proyectada si NO se actúa (próximos 7 días)
      case
        when days_of_inventory is not null then
          greatest(0, 7 - days_of_inventory) * velocity_daily * unit_price
        else 0
      end as projected_lost_sale
    from final_calc
    cross join lateral (select velocity_daily as velocity_28d_calc) v
  ),
  to_insert as (
    select
      org_id, chain_id, store_id, product_id,
      final_units as suggested_units,
      case when units_per_case is not null and units_per_case > 0
           then (final_units / units_per_case)::int else null end as suggested_cases,
      case when cases_per_pallet is not null and units_per_case is not null and cases_per_pallet > 0
           then ceil(final_units::numeric / (units_per_case * cases_per_pallet))::int else null end as suggested_pallets,
      current_inventory,
      days_of_inventory as current_ddi,
      velocity_daily,
      reason_code,
      case reason_code
        when 'stockout_risk' then 'DDI menor a 7 días — quiebre inminente'
        when 'low_ddi' then 'DDI bajo vs cobertura objetivo'
        when 'velocity_up' then 'Velocidad de venta acelerada vs últimos 28d'
        when 'periodic_replenish' then 'Reabasto periódico programado'
      end as reason_detail,
      round(projected_lost_sale::numeric, 2) as estimated_lost_sale,
      confidence_score
    from with_reason
    where final_units > 0
  )
  insert into suggested_orders (
    org_id, chain_id, store_id, product_id,
    suggested_units, suggested_cases, suggested_pallets,
    current_inventory, current_ddi, velocity_daily,
    reason_code, reason_detail, estimated_lost_sale, confidence,
    status, generated_at
  )
  select
    org_id, chain_id, store_id, product_id,
    suggested_units, suggested_cases, suggested_pallets,
    current_inventory, current_ddi, velocity_daily,
    reason_code, reason_detail, estimated_lost_sale, confidence_score,
    'new', now()
  from to_insert;

  get diagnostics inserted_count = row_count;
  return inserted_count;
end;
$$ language plpgsql;

-- ────────────────────────────────────────────────────────────
-- fn_compute_daily_kpis(p_org_id)
-- Snapshot diario de KPIs para el dashboard home
-- ────────────────────────────────────────────────────────────
create or replace function fn_compute_daily_kpis(p_org_id uuid)
returns int as $$
declare
  inserted_count int := 0;
  v_kpi_date date := current_date;
  v_chain_id uuid;
begin
  -- Por cada cadena habilitada para la org
  for v_chain_id in
    select chain_id from org_chain_access where org_id = p_org_id and enabled = true
  loop
    insert into daily_kpis (
      org_id, chain_id, kpi_date,
      total_inventory_value,
      total_stockouts,
      total_lost_sale_estimate,
      avg_fill_rate,
      total_active_pos,
      metadata
    )
    select
      p_org_id,
      v_chain_id,
      v_kpi_date,
      coalesce((select sum(value_at_cost) from vw_latest_inventory
        where org_id = p_org_id and chain_id = v_chain_id), 0) as total_inventory_value,
      coalesce((select count(*) from stockout_alerts
        where org_id = p_org_id and chain_id = v_chain_id and resolved = false), 0) as total_stockouts,
      coalesce((select sum(lost_sale_estimate) from stockout_alerts
        where org_id = p_org_id and chain_id = v_chain_id and resolved = false), 0) as total_lost_sale_estimate,
      coalesce((
        select round(avg(pol.fill_rate)::numeric, 2)
        from purchase_order_lines pol
        join purchase_orders po on po.id = pol.po_id
        where po.org_id = p_org_id and po.chain_id = v_chain_id
          and po.order_date > (current_date - interval '30 days')
      ), 0) as avg_fill_rate,
      coalesce((select count(*) from purchase_orders
        where org_id = p_org_id and chain_id = v_chain_id and status in ('pending', 'partial')), 0) as total_active_pos,
      jsonb_build_object('engine_version', 'v1', 'computed_at', now())
    on conflict (org_id, chain_id, kpi_date) do update set
      total_inventory_value = excluded.total_inventory_value,
      total_stockouts = excluded.total_stockouts,
      total_lost_sale_estimate = excluded.total_lost_sale_estimate,
      avg_fill_rate = excluded.avg_fill_rate,
      total_active_pos = excluded.total_active_pos,
      metadata = excluded.metadata;

    inserted_count := inserted_count + 1;
  end loop;

  return inserted_count;
end;
$$ language plpgsql;

-- ────────────────────────────────────────────────────────────
-- fn_run_engine(p_org_id)
-- Orquesta las 3 funciones anteriores
-- ────────────────────────────────────────────────────────────
create or replace function fn_run_engine(p_org_id uuid)
returns jsonb as $$
declare
  v_stockouts int;
  v_suggestions int;
  v_kpis int;
begin
  v_stockouts := fn_compute_stockouts(p_org_id);
  v_suggestions := fn_compute_suggestions(p_org_id);
  v_kpis := fn_compute_daily_kpis(p_org_id);

  return jsonb_build_object(
    'org_id', p_org_id,
    'stockouts_inserted', v_stockouts,
    'suggestions_generated', v_suggestions,
    'kpis_updated', v_kpis,
    'completed_at', now()
  );
end;
$$ language plpgsql;
