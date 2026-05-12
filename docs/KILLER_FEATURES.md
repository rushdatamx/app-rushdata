# KILLER FEATURES — Lo que diferencia a RushData

> Analicé los archivos reales de MITIENDA (ventas, inventario, OCs) y de MERCO. Estos son los features que hacen que un cliente pague — porque resuelven dolores que Power BI no resuelve, que la cadena no le da pre-empacado, y que el KAM hoy hace a mano en Excel (o no hace).

Categorías:
1. **Quick wins** — features baratos de construir, alto impacto inmediato (MVP)
2. **Diferenciadores** — los que justifican el precio (post-MVP cercano)
3. **Moat** — lo que hace que no se cambien a Power BI (medio plazo)

---

# 1. QUICK WINS (MVP)

## 1.1 Sugeridos de pedido con justificación
> Ya documentado en `FORMULAS.md`. Esta es la base.

**Dolor que resuelve:** El KAM hace sugeridos a mano en Excel todos los lunes. Le toma 3-4 horas. Se equivoca por fatiga.

**Diferenciador vs Handle/Savio:** mostramos el "por qué" (gráfica inventario+venta 30 días) inline.

---

## 1.2 Venta perdida estimada en $ (lost sale)
> Ya documentado.

**Dolor:** Un DDI = 0 no le dice nada al jefe del KAM. "$48,000 perdidos esta semana" sí.

**Cálculo:**
```
lost_sale_estimate = velocity_daily × days_in_stockout × unit_price
```

---

## 1.3 Fill rate de OC (gap pedido vs recibido)
> Cruce OC + (recepción real estimada vía inventario)

**Dolor:** El KAM pide 1,200 cajas. La cadena le surte 840. **Nadie le avisa**. Lo descubre cuando ve quiebres 3 semanas después.

**Cómo se calcula:**

```
Para una OC dada (po_number, store_id, product_id, units_ordered):
  
  expected_delivery_date = order_date + lead_time_promedio
  
  # Buscar el "salto" de inventario alrededor de la fecha esperada
  inventory_jump = MAX(inv.units en ventana [expected-3d, expected+3d]) 
                  - inv.units en (expected-1d)
  
  units_received_estimated = MAX(0, inventory_jump)
  fill_rate = units_received_estimated / units_ordered
```

**Display:**
> ⚠ HEB Punta Norte — OC #251222092 pidió 300 pzs de Durito Teja. Estimación: recibió 150 (50% fill). $4,500 MXN no vendidos por surtido incompleto.

**Premium feature:** Si la cadena reporta recepciones (HEBusiness sí lo hace en otra vista), Mario puede subir ese archivo y la estimación se vuelve real.

---

## 1.4 Top tiendas / Top productos (rankings vivos)

**Dolor:** "¿En qué tiendas estoy vendiendo más este periodo?" Se contesta con Power BI pero implica 30 min de setup cada vez.

**Implementación:** Cards rankeadas en home con sparklines:

```sql
-- Top 10 tiendas P05-2026
SELECT s.name, SUM(units) total_uds, SUM(revenue_no_tax) total_revenue
FROM sales s
JOIN stores st ON st.id = s.store_id
WHERE s.org_id = X AND s.period_code = 'P05-2026'
GROUP BY s.store_id, s.name
ORDER BY total_revenue DESC LIMIT 10;
```

**Twist diferenciador:** Mostrar **delta vs periodo anterior** (`▲ +12%` / `▼ -8%`) — no solo el número absoluto.

---

## 1.5 Heatmap de cobertura (tienda × SKU)

**Dolor:** El KAM quiere saber visualmente "¿en qué tiendas estoy y cuáles me están dejando morir?"

**Implementación:** Grid tienda (rows) × SKU (cols), cada celda coloreada:
- Verde: DDI > 14
- Amarillo: 7 < DDI < 14
- Rojo: DDI < 7
- Negro: DDI = 0 (stockout)
- Gris: producto no listado en esa tienda (potencial venta)

**Killer insight inline:** Te dice cuáles celdas grises son **oportunidad** (tiendas comparables venden bien ese SKU).

---

# 2. DIFERENCIADORES (post-MVP cercano)

## 2.1 ⭐ Lead time real por cadena/tienda

**Dolor:** El KAM asume "HEB me tarda 7 días en recibir" pero NO sabe el lead time real ni cómo varía por tienda.

**Cómo se calcula:**

```
Para cada OC histórica:
  lead_time = primera_fecha_con_inventory_jump - order_date

avg_lead_time_per_store_chain = AVG(lead_time)
p90_lead_time = percentile(0.90)  -- para planeación conservadora
```

**Display:**
> HEB Punta Norte lead time: **8.2 días promedio** (P90: 12 días). Plan tu próxima OC con 12 días de buffer.

**Por qué es killer:** Ningún reporte de la cadena te da esto. Le permite al KAM **adelantar pedidos** y dejar de quebrar.

---

## 2.2 ⭐⭐ On-Shelf Availability (OSA) Index

**Dolor:** No es lo mismo "tener inventario en tienda" que "tener producto en anaquel". Pero si el producto vendió ayer, sabemos que ESTUVO en anaquel. Si NO vendió y había inventario, hay un **phantom stockout** (inventario fantasma).

**Cómo se detecta:**

```
phantom_stockout IF:
  inventory_units > 0 (tienda dice que hay)
  AND sales últimos N días == 0
  AND avg_sales mismas tiendas hermanas > 0
  
  (la tienda tiene en sistema pero no en piso)
```

**Display:**
> 🚨 HEB Galerías Valle Oriente — Papa Sal 340g muestra 12 pzs en sistema pero **0 ventas en 8 días**. Tiendas comparables venden 3 pzs/día. Probable: extraviado en bodega, mal acomodado, o caducidad cercana.

**Por qué es killer:** Esto es lo que en retail llaman "the most expensive zero". El producto está pagado, en el sistema, pero NO se vende. El KAM puede llamar al supervisor de tienda y rescatarlo.

---

## 2.3 ⭐⭐ Promociones detectadas + impacto (sin que el cliente diga nada)

**Dolor:** El KAM sabe que hubo promoción de "2x1 en papas" la semana pasada pero NO tiene cómo medir cuánto subió la venta.

**Detección automática:**

```
promotion_detected IF:
  units_sold_this_week > avg_units_4w × 1.5
  AND price_avg_this_week < price_avg_4w × 0.85

  (volumen sube 50%+ Y precio baja 15%+)
```

**Display:**
> 🎉 Promoción detectada: Papa Fuego 45g en 8 tiendas HEB del 2026-04-15 al 2026-04-21. Lift: **+187% en unidades**. Precio promedio bajó de $18.50 → $14.20. ROI estimado: $42k venta incremental.

**Bonus:** Después de la promoción, alertar "post-promo trough" (caída esperada) → el KAM no se asusta cuando bajen las ventas la semana siguiente.

---

## 2.4 ⭐ Productos "fantasma" — listados pero no surtidos

**Detección:**

```
phantom_listing IF:
  store-SKU existe en catálogo (apareció alguna vez en sales o inventory)
  AND última venta > 60 días
  AND último inventario = 0 por 30+ días
  AND no aparece en ninguna OC reciente
  
  (la tienda lo tiene listado, pero no lo está pidiendo NI recibiendo)
```

**Display:**
> 👻 14 combinaciones tienda-SKU están "fantasma": listadas en sistema pero sin movimiento. Potencial de venta dormida: **$28k MXN/mes**.

**Acción sugerida:** Esto le da al KAM munición para hablar con el comprador de la cadena: "estas 14 tiendas tienen tu producto listado pero no surtido, por favor activa".

---

## 2.5 ⭐⭐⭐ Voz de venta perdida acumulada (anti-Power BI killer)

**Dolor:** El KAM nunca sabe **cuánto le costó al negocio NO haber pedido lo que debió**.

**Cómo:**

Cada noche al correr el motor, se guardan los sugeridos generados. Si una semana después se cumple cualquiera de:
- Sí se pidió → OK
- NO se pidió Y la tienda entró en stockout → **se acumula al "Lost Sale Ledger"**

```sql
CREATE TABLE lost_sale_ledger (
  org_id uuid,
  product_id uuid,
  store_id uuid,
  week_start date,
  suggested_units numeric,
  ordered_units numeric,
  delta_units numeric,
  stockout_days int,
  lost_revenue numeric
);
```

**Display:** Dashboard "Money left on the table" — gráfica acumulada YTD.
> Año 2026 (5 meses): **$284,500 MXN de venta perdida acumulada** por sugeridos no cumplidos. Compara contra tu costo de la plataforma RushData.

**Por qué es killer:** Justifica el precio del SaaS con MATEMÁTICAS. "Pagas $X/mes, te ahorras $5X/mes en venta perdida".

---

## 2.6 ⭐ Detector de OC sub-óptima

**Dolor:** A veces el cliente pide a HEB algo y la cadena le manda **menos** de lo sugerido. ¿Por qué? El KAM nunca se entera del gap entre "lo que él quería pedir" vs "lo que terminó siendo la OC".

**Cómo:**

```
Cada OC recibida del portal HEB se compara contra el último 
suggested_orders.suggested_units generado para el mismo (store, product, periodo):

  gap = po_line.units_ordered - suggested.suggested_units

  IF gap < 0 → "sub-pedido" — la cadena pidió MENOS de lo que necesitabas
  IF gap > 50% → "sobre-pedido" — pidieron más, atención sobre-inventario
```

**Display:**
> 📊 De los 18 SKUs en HEB, **5 fueron sub-pedidos en P05-2026**. Pediste 1,260 pzs Papa 45g Natural, sugerido era 1,680. Si vendes a velocidad actual, **quiebre proyectado: 4 días antes del próximo ciclo**.

---

# 3. MOAT (medio plazo)

## 3.1 Comparativos vs categoría (benchmarking anónimo)

Solo funciona cuando tengas múltiples clientes en la misma categoría.

**Dolor:** El KAM nunca sabe si su crecimiento de 8% es bueno o malo vs su competencia en el mismo retailer.

**Cómo:**
```
Para clientes en categoría 'papas fritas' en HEB:
  Tu_crecimiento_4w = X%
  Categoría_avg = AVG(Y%)
  Tu_posicion = percentile(Tu_crecimiento dentro de la categoría)
```

**Display:**
> 📈 Tu marca Delikos crece **+8% en HEB** P05-2026 vs P04. **Categoría papas fritas en HEB: +3% promedio**. Estás en el **percentil 78** — top 22% de tu categoría.

**Privacy:** Datos agregados, anonimizados. Nunca se muestra "Sabritas creció 5%". Se muestra "el promedio de la categoría creció 5%".

---

## 3.2 Forecast con feriados y estacionalidad

**Dolor:** El KAM sabe que Semana Santa, fin de año, regreso a clases mueven las ventas, pero no las cuantifica.

**Implementación:** Usar histórico + calendario de feriados MX para proyectar siguientes 4 semanas.

```python
# Simple: Holt-Winters o Prophet
forecast = HoltWinters(sales_history).fit().predict(periods=4)
adjusted = forecast × holiday_multiplier(holidays_next_4w)
```

**Display en sugeridos:**
> 🔮 Próximas 4 semanas incluyen Día de las Madres (10 mayo). Lift histórico en papas: +18%. Sugerido ajustado: +18% sobre baseline.

---

## 3.3 Cross-channel intelligence (cuando cliente vende en 3+ cadenas)

**Dolor:** ¿Mi Papa Sal 340g vende más en HEB o en MERCO? ¿Y por qué?

**Cómo:** Análisis comparativo por (product, chain), normalizado por # de tiendas.

```sql
SELECT chain.name, AVG(units / num_stores) as velocity_normalized
FROM sales s JOIN chains c ...
WHERE product_upc = X AND period_code IN last 3 months
GROUP BY chain.name;
```

**Display:** "Papa Sal 340g vende 3.2 pzs/tienda/día en MERCO vs 1.8 en HEB. **MERCO es 78% más eficiente para este SKU.**"

---

## 3.4 Alertas inteligentes (no solo umbral)

**Dolor:** Alertas tipo "DDI < 7" se vuelven ruido. El KAM las ignora.

**Solución:** Alertas con **contexto**:

❌ Mal: "Papa Sal en Punta Norte tiene DDI = 5"
✅ Bien: "Papa Sal en Punta Norte tiene DDI = 5 PERO normalmente baja a 3 antes de cada OC del miércoles, y la OC ya está programada. **Sin acción.**"

✅ Crítico: "Papa Sal en Punta Norte tiene DDI = 5 Y no hay OC programada en 9 días Y velocity está subiendo. **Acción urgente: pedir antes del viernes.**"

Esto requiere combinar: inventory + OC programadas + velocity trend + lead time.

---

## 3.5 Cohorte de tiendas — "tiendas hermanas"

**Dolor:** ¿Cómo compara HEB Punta Norte vs HEB Galerías? Son tiendas similares (mismo formato, ciudad).

**Implementación:** Clustering por similaridad de ventas históricas:

```python
# Clusterear tiendas por su vector de ventas
from sklearn.cluster import KMeans
KMeans(n_clusters=5).fit(sales_matrix)
```

**Display:** "HEB Punta Norte pertenece al cluster 'Monterrey Premium' (8 tiendas). Tu velocity ahí está en percentil 45 — **medio-bajo vs hermanas**. Oportunidad de crecimiento."

---

# Priorización para roadmap

| Feature | MVP | V1.1 | V1.5 | V2 |
|---|---|---|---|---|
| 1.1 Sugeridos con justificación | ✅ | | | |
| 1.2 Lost sale en $ | ✅ | | | |
| 1.3 Fill rate de OC | ✅ | | | |
| 1.4 Top tiendas / productos | ✅ | | | |
| 1.5 Heatmap cobertura | ✅ | | | |
| 2.1 Lead time real | | ✅ | | |
| 2.2 On-Shelf Availability (phantom) | | ✅ | | |
| 2.5 Lost Sale Ledger | | ✅ | | |
| 2.6 OC sub-óptima detector | | ✅ | | |
| 2.3 Promociones detectadas | | | ✅ | |
| 2.4 Productos fantasma | | | ✅ | |
| 3.1 Benchmarking anónimo | | | | ✅ |
| 3.2 Forecast estacional | | | | ✅ |
| 3.3 Cross-channel intel | | | | ✅ |
| 3.4 Alertas inteligentes | | | | ✅ |
| 3.5 Cohorte tiendas | | | | ✅ |

**Mi recomendación:**
- MVP cierra con 1.1 a 1.5 → ya tienes producto vendible.
- 2.1 + 2.2 + 2.5 son **los killer features que cierran ventas** post-MVP. Trabajar en éstos a 2-3 semanas del MVP.
- 3.x cuando tengas 5+ clientes (benchmarking necesita masa).

---

# Pitch deck en 1 párrafo

> **RushData no te muestra dashboards bonitos. Te dice qué pedir, cuánto vas a perder si no lo haces, y por qué la cadena te está dejando colgado. Cada noche revisamos tus tiendas y SKUs, detectamos quiebres que la cadena no te avisa, calculamos el dinero que estás dejando en la mesa, y te mandamos el correo con los 10 movimientos del día. Si Power BI te dice qué pasó, RushData te dice qué hacer.**

---

# Datos que reforcé al analizar archivos reales

- **HEB venta-delikos.xls**: 46,339 filas con periodo fiscal — confirmado patrón histórico desde 2024-09. Volumen suficiente para forecast.
- **HEB OC**: formato wide es el estándar. Ya entendí cómo pivotar a long.
- **MERCO**: OC son bulk a CEDIS, sin granularidad por tienda — pero igual sirve para fill rate a nivel SKU.
- **MERCO ventas**: NO trae precio promedio → calcular en ingesta (`venta_pesos / unidades`).
- **UPCs en MERCO**: algunos cortos (códigos internos como `1290`, `9811`) — el adapter debe distinguir.

Todo esto ya está reflejado en `SCHEMA.md`, `INGEST_PATTERN.md` y `FORMULAS.md`.
