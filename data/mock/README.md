# Mock Data — Sazonadores Vence Real

> Demo dataset para mostrar PORTAL a clientes prospecto. **NO son datos reales** — sirve para enseñar las capacidades del producto sin exponer datos sensibles de clientes reales.

## Org demo

- **Nombre:** Sazonadores Vence Real
- **Slug:** `sazonadores-vence-real`
- **Plan:** `demo`
- **Cadenas habilitadas:** HEB

## Flujo de carga (capa por capa)

Cargamos los CSVs en orden estricto porque cada uno depende del anterior (FKs):

| Orden | Archivo | Mario llena | Claude carga a |
|---|---|---|---|
| 1 | `01_products.csv` | ✏️ pendiente | tabla `products` |
| 2 | `02_stores.csv` | ✏️ pendiente | tabla `stores` |
| 3 | `03_product_packaging.csv` | ✏️ pendiente | tabla `product_packaging` |
| 4 | `04_inventory.csv` | ✏️ pendiente | tabla `inventory_snapshots` |
| 5 | `05_sales.csv` | ✏️ pendiente | tabla `sales` |
| 6 | `06_purchase_orders.csv` | ✏️ pendiente | tabla `purchase_orders` |
| 7 | `07_purchase_order_lines.csv` | ✏️ pendiente | tabla `purchase_order_lines` |

## Convenciones

- **Codificación:** UTF-8
- **Separador:** `,` (coma)
- **Comillas:** solo cuando el campo contenga coma (`"Sal, ajo y limón"`)
- **Decimales:** `.` (punto), nunca coma
- **Fechas:** `YYYY-MM-DD` (ej: `2026-05-12`)
- **Headers:** primera fila, exactamente como aparecen en cada plantilla
- **Tipo dato vacío:** dejar la celda en blanco (no `NULL`, no `N/A`)

## Cómo funciona el proceso

1. Claude crea la plantilla CSV con headers + 2-3 filas de ejemplo
2. Mario abre en Numbers/Excel, llena todas las filas, exporta como CSV
3. Mario avisa "ya está listo `01_products.csv`"
4. Claude lee el CSV, valida formato, lo carga a Supabase con `service_role` (bypassa RLS)
5. Claude verifica conteos vs lo que Mario subió
6. Pasamos al siguiente CSV

## Cuando entren clientes reales

Este mismo flujo de CSV se reutiliza. Cada cliente nuevo:
- Genera su propio slug de org
- Llena sus propios CSVs (o el SaaS los importa de Excel del portal de retailer)
- Carga vive aislada por `org_id` + RLS
