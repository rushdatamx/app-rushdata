# FORMULAS — Motor de sugeridos

> Lógica matemática del producto. Todo cálculo del motor vive en `sql/03_functions.sql` como Postgres functions. Cuando una fórmula cambie, actualizar este doc PRIMERO.

---

## Conceptos base

### 1. Velocity (venta promedio diaria)

Para un producto-tienda dado, sobre ventana de N días:

```
velocity_daily(store, product, days_window) =
  SUM(sales.units WHERE sale_date IN last N days) / N
```

**Default:** ventana de 28 días (4 semanas) para suavizar variaciones semanales.
**Mínimo de datos:** Si la tienda-SKU tiene < 14 días con ventas, marcar `confidence < 0.5`.

### 2. Días de Inventario (DDI / DOS)

```
days_of_inventory(store, product) =
  current_inventory(store, product) / velocity_daily(store, product)
```

Casos especiales:
- Si `velocity_daily == 0` → DDI = `NULL` (no podemos decir "infinito")
- Si `current_inventory == 0` y `velocity_daily > 0` → DDI = `0` (quiebre)

### 3. Cover target (días a cubrir)

Por cadena/categoría se define cuántos días debe cubrir el inventario:

```
cover_target_days =
  CASE
    WHEN chain = 'heb' AND category = 'papas' THEN 21    -- 3 semanas
    WHEN chain = 'heb' AND category = 'tostadas' THEN 14
    WHEN chain = 'merco' AND category = 'tostadas' THEN 14
    ELSE 14
  END
```

Estos valores van en tabla `chain_category_targets` (futura, o hardcoded en función v1).

---

## El cálculo de sugerido (formula maestra)

### Sugerido por tienda × producto

```
suggested_units(store, product) =
  MAX(0,
    (velocity_daily × cover_target_days) - current_inventory + reservation_in_transit
  )
```

Donde:
- `reservation_in_transit` = unidades en OC pendientes para esa tienda × producto
- `MAX(0, ...)` porque nunca sugerimos cantidad negativa

### Aplicar reglas de empaque

```
suggested_cases(store, product) =
  CEIL(suggested_units / units_per_case)

suggested_units_rounded =
  suggested_cases × units_per_case
```

### Aplicar `order_multiple`

Si el cliente solo pide en múltiplos (ej cajas de 24 o tarimas de 240):

```
final_suggested_units =
  CEIL(suggested_units_rounded / order_multiple) × order_multiple
```

### Aplicar min_order_units

Si hay mínimo por tienda y el sugerido cae debajo:

```
IF final_suggested_units > 0 AND final_suggested_units < min_order_units
   THEN final_suggested_units = min_order_units
```

### Sugerido en tarimas (si aplica)

Para SKUs que solo se piden por tarima completa (MERCO Tostada Roja 70PZ):

```
suggested_pallets =
  CEIL(final_suggested_units / cases_per_pallet)

final_suggested_units =
  suggested_pallets × cases_per_pallet
```

---

## Regla específica: Multi-flavor restock (PDQ)

> Para PDQs (Pre-pack Display Quantity) que mezclan sabores, NO se pide por sabor — se pide el PDQ completo.

### Detección

```
multi_flavor_alert IF:
  product.subcategory IN ('pdq_340', 'pdq_45')
  AND COUNT(*) >= 2 sabores del mismo subcategory en la misma tienda
                     con 0 < DDI < 15
```

### Sugerido

Si se cumple la condición, sugerir 1 PDQ completo:

```
suggested_units = pdq_size (240 para 340gr, 1260 para 45gr)
distribuido equitativamente entre los 3 sabores:
  Sal/Natural: pdq_size / 3
  Fuego: pdq_size / 3
  Jalapeño: pdq_size / 3
```

**Reason code:** `multi_flavor_restock`

---

## Códigos de razón (reason_code)

| Código | Significado | Condición |
|---|---|---|
| `low_ddi` | Inventario bajo en una tienda | DDI < cover_target × 0.5 |
| `velocity_up` | Aumento súbito de venta | velocity_7d > velocity_28d × 1.5 |
| `stockout_risk` | A días de quebrar | DDI > 0 AND DDI < 7 |
| `multi_flavor_restock` | PDQ: 2+ sabores bajos | Ver regla anterior |
| `periodic_replenish` | Reabasto rutinario | DDI < cover_target AND no es ninguna de las anteriores |

Prioridad de display: stockout_risk > multi_flavor_restock > low_ddi > velocity_up > periodic_replenish.

---

## Venta perdida estimada (lost_sale_estimate)

> Convierte el problema técnico de DDI=0 en dinero. El "wow" del producto.

### Stockout activo

Si el producto-tienda lleva N días en stockout:

```
lost_sale_estimate =
  velocity_daily × days_in_stockout × unit_price
```

### Stockout proyectado (en sugerido)

Si NO se cumple el sugerido, asumimos que entra en stockout cuando se agote el inventario actual:

```
days_until_stockout =
  current_inventory / velocity_daily

projected_lost_sale (siguientes 7 días si no se surte) =
  MAX(0, (7 - days_until_stockout)) × velocity_daily × unit_price
```

---

## Confidence score

> Para que el frontend pueda mostrar "sugeridos sólidos" vs "revisar antes de pedir".

```
confidence(store, product) =
  base_confidence × data_completeness × variance_penalty

base_confidence = 1.0

data_completeness = 
  MIN(1.0, days_with_sales_data / 28)   -- penaliza < 28 días

variance_penalty =
  1 - MIN(0.5, coefficient_of_variation(daily_sales))
  -- penaliza productos muy erráticos (cv = stddev/mean)
```

Rango: 0.30 a 1.00.

**Display thresholds:**
- ≥ 0.80 → verde "Sólido"
- 0.50–0.79 → amarillo "Revisar"
- < 0.50 → gris "Datos insuficientes"

---

## Fill rate (de OC)

### Por línea de OC

```
fill_rate_line = (units_received / units_ordered) × 100
```

Ya está calculado como columna generada en `purchase_order_lines`.

### Por OC

```
fill_rate_po = (SUM(units_received) / SUM(units_ordered)) × 100
```

### Por tienda (último periodo)

```
fill_rate_store = 
  (SUM(units_received) / SUM(units_ordered)) × 100
  FOR all po_lines WHERE store_id = X AND order_date IN last period
```

---

## KPIs del dashboard (home)

### `total_lost_sale_estimate`

```
SUM(stockout_alerts.lost_sale_estimate)
  WHERE org_id = X AND resolved = false
```

### `total_stockouts`

```
COUNT(DISTINCT (store_id, product_id))
  FROM stockout_alerts
  WHERE org_id = X AND resolved = false
```

### `avg_fill_rate`

```
AVG(fill_rate_line)
  FROM purchase_order_lines pol JOIN purchase_orders po ON ...
  WHERE po.org_id = X AND po.order_date IN last 30 days
```

### `total_active_pos`

```
COUNT(*) FROM purchase_orders
  WHERE org_id = X AND status IN ('pending', 'partial')
```

### `inventory_value`

```
SUM(value_at_cost)
  FROM inventory_snapshots
  WHERE org_id = X AND snapshot_date = (most recent)
```

---

## Cuándo se ejecuta el motor

**Default:** Job programado en pg_cron cada noche a las 04:00 hora MX:

1. Para cada `org_id` activa:
   - Calcular velocity y DDI por tienda × producto (últimos 28 días)
   - Detectar stockouts → poblar `stockout_alerts`
   - Calcular sugeridos por todas las reglas
   - Aplicar empaque y multiplos
   - Insertar en `suggested_orders` con `status = 'new'`
   - Marcar sugeridos del día anterior no actuados como `expired`
2. Calcular snapshot de `daily_kpis`

**Trigger manual:** Botón "Recalcular ahora" en frontend → Edge Function que llama la misma función.

---

## Versionado del motor

Cuando cambies una fórmula, hazlo en archivo nuevo:

- `sql/03_functions_v1.sql` — versión actual
- `sql/03_functions_v2.sql` — siguiente versión con drop/recreate
- Actualizar este FORMULAS.md ANTES de tocar SQL

Cada `suggested_orders` puede llevar `engine_version` en `metadata` para auditoría.

---

## Casos borde que el motor maneja

| Caso | Comportamiento |
|---|---|
| Tienda nueva sin histórico | confidence = 0.30, sugerido = min_order_units si existe, sino skip |
| Producto nuevo (< 14 días) | Mismo tratamiento, marcar `data_completeness < 0.5` |
| Tienda CEDIS (`is_cedis = true`) | NO generar sugeridos (CEDIS recibe bulk, no sell-out) |
| Tienda `active = false` | Skip |
| Producto `active = false` | Skip |
| OC pendiente para mismo SKU-tienda | Restar `units_pending` del sugerido |
| Velocity = 0 últimos 28 días | NO sugerir (item muerto), generar alerta `dead_sku` (futuro) |
| Fecha snapshot no es de hoy | Usar el más reciente disponible, pero marcar `stale = true` en metadata |
