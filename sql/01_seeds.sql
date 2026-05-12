-- ============================================================
-- PORTAL — Seeds
-- Catálogos base que Mario mantiene (chains, calendario fiscal HEB)
-- + organización pilot "Delikos"
-- ============================================================

-- ────────────────────────────────────────────────────────────
-- Chains
-- ────────────────────────────────────────────────────────────
insert into chains (slug, name, country, calendar_type) values
  ('heb', 'HEB México', 'MX', 'fiscal'),
  ('merco', 'MERCO', 'MX', 'gregorian'),
  ('alsuper', 'ALSUPER', 'MX', 'gregorian')
on conflict (slug) do nothing;

-- ────────────────────────────────────────────────────────────
-- Calendario fiscal HEB 2025-2026
-- 13 periodos / año (~4 semanas), periodo 13 = 5 semanas
-- AJUSTAR FECHAS REALES desde el calendario oficial de HEB
-- ────────────────────────────────────────────────────────────
do $$
declare
  heb_id uuid;
begin
  select id into heb_id from chains where slug = 'heb';

  insert into chain_calendars (chain_id, period_code, period_year, period_number, period_start, period_end) values
    -- 2025 (FECHAS PRELIMINARES — Mario debe validar contra calendario oficial)
    (heb_id, 'P01-2025', 2025, 1,  '2024-12-30', '2025-01-26'),
    (heb_id, 'P02-2025', 2025, 2,  '2025-01-27', '2025-02-23'),
    (heb_id, 'P03-2025', 2025, 3,  '2025-02-24', '2025-03-23'),
    (heb_id, 'P04-2025', 2025, 4,  '2025-03-24', '2025-04-20'),
    (heb_id, 'P05-2025', 2025, 5,  '2025-04-21', '2025-05-18'),
    (heb_id, 'P06-2025', 2025, 6,  '2025-05-19', '2025-06-15'),
    (heb_id, 'P07-2025', 2025, 7,  '2025-06-16', '2025-07-13'),
    (heb_id, 'P08-2025', 2025, 8,  '2025-07-14', '2025-08-10'),
    (heb_id, 'P09-2025', 2025, 9,  '2025-08-11', '2025-09-07'),
    (heb_id, 'P10-2025', 2025, 10, '2025-09-08', '2025-10-05'),
    (heb_id, 'P11-2025', 2025, 11, '2025-10-06', '2025-11-02'),
    (heb_id, 'P12-2025', 2025, 12, '2025-11-03', '2025-11-30'),
    (heb_id, 'P13-2025', 2025, 13, '2025-12-01', '2026-01-04'),  -- 5 semanas
    -- 2026
    (heb_id, 'P01-2026', 2026, 1,  '2026-01-05', '2026-02-01'),
    (heb_id, 'P02-2026', 2026, 2,  '2026-02-02', '2026-03-01'),
    (heb_id, 'P03-2026', 2026, 3,  '2026-03-02', '2026-03-29'),
    (heb_id, 'P04-2026', 2026, 4,  '2026-03-30', '2026-04-26'),
    (heb_id, 'P05-2026', 2026, 5,  '2026-04-27', '2026-05-24'),
    (heb_id, 'P06-2026', 2026, 6,  '2026-05-25', '2026-06-21'),
    (heb_id, 'P07-2026', 2026, 7,  '2026-06-22', '2026-07-19'),
    (heb_id, 'P08-2026', 2026, 8,  '2026-07-20', '2026-08-16'),
    (heb_id, 'P09-2026', 2026, 9,  '2026-08-17', '2026-09-13'),
    (heb_id, 'P10-2026', 2026, 10, '2026-09-14', '2026-10-11'),
    (heb_id, 'P11-2026', 2026, 11, '2026-10-12', '2026-11-08'),
    (heb_id, 'P12-2026', 2026, 12, '2026-11-09', '2026-12-06'),
    (heb_id, 'P13-2026', 2026, 13, '2026-12-07', '2027-01-03')
  on conflict (chain_id, period_code) do nothing;
end $$;

-- ────────────────────────────────────────────────────────────
-- Organización pilot: Delikos
-- ────────────────────────────────────────────────────────────
insert into organizations (slug, name, plan) values
  ('delikos', 'Delikos S.A. de C.V.', 'pilot')
on conflict (slug) do nothing;

-- Habilitar Delikos para HEB
do $$
declare
  delikos_id uuid;
  heb_id uuid;
begin
  select id into delikos_id from organizations where slug = 'delikos';
  select id into heb_id from chains where slug = 'heb';

  insert into org_chain_access (org_id, chain_id, enabled) values
    (delikos_id, heb_id, true)
  on conflict (org_id, chain_id) do nothing;
end $$;

-- ────────────────────────────────────────────────────────────
-- Productos Delikos en HEB (PDQ 340gr + PDQ 45gr)
-- ────────────────────────────────────────────────────────────
do $$
declare
  delikos_id uuid;
  heb_id uuid;
  p_id uuid;
begin
  select id into delikos_id from organizations where slug = 'delikos';
  select id into heb_id from chains where slug = 'heb';

  -- PDQ 340gr (3 sabores, 80 pzs/sabor en pre-pack de 240)
  insert into products (org_id, upc, name, category, subcategory, size_grams) values
    (delikos_id, '7502256160833', 'Papa Casera Sal 340gr', 'papas', 'pdq_340', 340),
    (delikos_id, '7502256160840', 'Papa Casera Fuego 340gr', 'papas', 'pdq_340', 340),
    (delikos_id, '7502256160857', 'Papa Casera Jalapeño 340gr', 'papas', 'pdq_340', 340)
  on conflict (org_id, upc) do nothing;

  -- PDQ 45gr (3 sabores, 420 pzs/sabor en pre-pack de 1260)
  insert into products (org_id, upc, name, category, subcategory, size_grams) values
    (delikos_id, '7502256160802', 'Papa Casera Natural 45gr', 'papas', 'pdq_45', 45),
    (delikos_id, '7502256160819', 'Papa Casera Fuego 45gr', 'papas', 'pdq_45', 45),
    (delikos_id, '7502256160826', 'Papa Casera Jalapeño 45gr', 'papas', 'pdq_45', 45)
  on conflict (org_id, upc) do nothing;

  -- Empaque por SKU en HEB
  -- PDQ 340: 80 pzs/sabor, no aplica unidad de caja individual (van en PDQ completo)
  -- PDQ 45: 420 pzs/sabor

  for p_id in select id from products where org_id = delikos_id and subcategory = 'pdq_340' loop
    insert into product_packaging (product_id, chain_id, units_per_case, cases_per_pallet, order_multiple)
    values (p_id, heb_id, 80, null, 80)
    on conflict (product_id, chain_id) do nothing;
  end loop;

  for p_id in select id from products where org_id = delikos_id and subcategory = 'pdq_45' loop
    insert into product_packaging (product_id, chain_id, units_per_case, cases_per_pallet, order_multiple)
    values (p_id, heb_id, 420, null, 420)
    on conflict (product_id, chain_id) do nothing;
  end loop;
end $$;

-- ────────────────────────────────────────────────────────────
-- NOTA: Las 26 tiendas HEB de Delikos se cargan desde el script
-- de ingesta de Mario, no aquí, porque pueden cambiar.
-- ────────────────────────────────────────────────────────────
