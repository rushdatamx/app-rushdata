# INGEST_PATTERN — Cómo se aísla cada cadena

> **Pregunta de Mario:** "Si mañana agrego MERCO con columnas totalmente distintas a HEB, ¿cómo lo manejaría un experto en base de datos?"
>
> **Respuesta corta:** Con el patrón **Adapter** (también llamado **ETL adapter** o **chain adapter**). El schema canónico de la BD NO se toca jamás. Cada cadena tiene su propio "traductor" en Python que normaliza su formato raro al formato canónico antes de insertar.

---

## El principio: separar QUÉ se guarda de CÓMO viene

La industria llama a esto **separation of concerns** entre la capa **transactional** y la capa **integration**.

```
┌─────────────────────────────────────────────────────────────┐
│  CAPA INTEGRACIÓN (cambia por cadena — adapters)            │
│  ├── ingest/heb/      ← HEB: wide OC, fiscal calendar       │
│  ├── ingest/merco/    ← MERCO: bulk OC, gregorian, PDFs     │
│  ├── ingest/alsuper/  ← ALSUPER: solo inventario             │
│  └── ingest/walmart/  ← futuro                              │
└─────────────────────────────────────────────────────────────┘
                          ↓ (normaliza al schema canónico)
┌─────────────────────────────────────────────────────────────┐
│  CAPA CANÓNICA (NUNCA cambia)                               │
│  inventory_snapshots / sales / purchase_orders / ...        │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  CAPA ANALÍTICA (motor sugeridos, KPIs)                     │
│  fn_compute_suggestions() lee del canónico — agnóstica       │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│  CAPA PRESENTACIÓN (frontend)                                │
│  Next.js — lee del canónico, no sabe de cadenas             │
└─────────────────────────────────────────────────────────────┘
```

**La regla de oro:** Solo la capa de integración conoce el formato real de la cadena. Todo lo de arriba ve datos limpios y uniformes.

---

## Estructura concreta del código de ingesta

```
ingest/
├── shared/
│   ├── db.py                     # cliente Supabase compartido
│   ├── ingestion_run.py          # tracking de runs
│   ├── normalizers.py            # helpers de normalización (UPC, fechas, etc)
│   └── canonical.py              # dataclasses que matchean el schema
│
├── heb/                          # ADAPTER HEB
│   ├── __init__.py
│   ├── config.py                 # paths, headers esperados, mapeos
│   ├── load_stores.py
│   ├── load_inventory.py         # adaptador inventario HEB → canónico
│   ├── load_sales.py             # adaptador ventas HEB → canónico
│   ├── load_po.py                # OC wide → long (1 row por tienda/sku)
│   └── README.md                 # formato esperado de cada archivo
│
├── merco/                        # ADAPTER MERCO (futuro)
│   ├── __init__.py
│   ├── config.py
│   ├── load_stores.py
│   ├── load_inventory.py         # adaptador inventario MERCO → canónico
│   ├── load_sales.py             # MERCO no tiene precio_promedio → calcular
│   ├── load_po.py                # OC ya es long, pero usa "BULTO"/"CAJA"
│   ├── parse_oc_pdf.py           # parser PDF a CSV (MERCO viene en PDF)
│   └── README.md
│
└── alsuper/                      # ADAPTER ALSUPER (futuro)
    ├── load_inventory.py         # solo inventario, no hay sell-out
    └── README.md
```

---

## Cada adapter implementa la misma interfaz

```python
# ingest/shared/canonical.py

from dataclasses import dataclass
from datetime import date
from typing import Optional

@dataclass
class CanonicalInventoryRow:
    org_id: str
    chain_id: str
    store_external_code: str
    product_upc: str
    snapshot_date: date
    units: float
    days_of_inventory: Optional[float]
    value_at_cost: Optional[float]
    value_at_retail: Optional[float]

@dataclass
class CanonicalSaleRow:
    org_id: str
    chain_id: str
    store_external_code: str
    product_upc: str
    sale_date: date
    period_code: Optional[str]  # solo si chain.calendar_type = 'fiscal'
    units: float
    revenue_no_tax: float
    price_avg: Optional[float]

@dataclass
class CanonicalPOLine:
    org_id: str
    chain_id: str
    po_number: str
    order_date: date
    store_external_code: Optional[str]  # None si OC bulk a CEDIS (MERCO)
    product_upc: str
    units_ordered: float
    units_received: Optional[float]
```

Cada adapter expone funciones que devuelven estas estructuras:

```python
# ingest/heb/load_po.py

from typing import Iterable
from ingest.shared.canonical import CanonicalPOLine

def parse_heb_po(filepath: str, order_date: date) -> Iterable[CanonicalPOLine]:
    """
    HEB OC viene WIDE: una columna por tienda.
    Pivot a LONG y devolver CanonicalPOLine por celda > 0.
    """
    df = pd.read_excel(filepath, engine='openpyxl', header=1)
    df = df.loc[:, ~df.columns.astype(str).str.startswith('Unnamed')]
    
    po_number = str(df['No. Orden'].iloc[0])
    store_cols = [c for c in df.columns if str(c).startswith('Tienda ')]
    
    for _, row in df.iterrows():
        upc = str(row['Código de Barras'])
        for col in store_cols:
            qty = row[col]
            if pd.notna(qty) and qty > 0:
                yield CanonicalPOLine(
                    org_id=..., chain_id=...,
                    po_number=po_number,
                    order_date=order_date,
                    store_external_code=col.replace('Tienda ', ''),
                    product_upc=upc,
                    units_ordered=float(qty),
                    units_received=None
                )
```

```python
# ingest/merco/load_po.py — formato totalmente distinto, mismo output

def parse_merco_po(filepath_csv: str) -> Iterable[CanonicalPOLine]:
    """
    MERCO OC ya es LONG, pero es bulk a CEDIS (store=None).
    Multiplica cantidad × contenido para sacar total_uds.
    """
    df = pd.read_csv(filepath_csv)
    
    for _, row in df.iterrows():
        yield CanonicalPOLine(
            org_id=..., chain_id=...,
            po_number=row['numero_oc'],
            order_date=...,  # parsea del nombre del archivo
            store_external_code=None,   # bulk a CEDIS
            product_upc=str(row['upc']),
            units_ordered=float(row['total_uds']),
            units_received=None
        )
```

**Resultado:** la BD ve filas idénticas. El motor de sugeridos no sabe ni le importa de qué cadena vinieron.

---

## Differences clave HEB vs MERCO (descubiertas analizando archivos reales)

### HEB (MITIENDA)

| Aspecto | Detalle |
|---|---|
| Ventas | `periodo_fiscal` + `semana_fiscal` + `fecha`. Usa **calendario fiscal HEB** (13 periodos) |
| Ventas — columnas | `periodo_fiscal`, `semana_fiscal`, `fecha`, `tienda_codigo`, `upc`, `venta_sin_iva`, `unidades`, `precio_promedio` |
| Inventario | `DOS Unidades` = días-de-stock pre-calculado |
| Inventario — columnas | `Fecha`, `ID_Tienda`, `UPC`, `Inventario`, `Inventario a Costo`, `Inventario a Precio`, `DOS Unidades` |
| OC | Formato **WIDE**: 1 fila = SKU, columnas dinámicas `Tienda 2906`, `Tienda 2917`, … |
| OC — granularidad | Por tienda individual |
| OC — campos | `No. Orden`, `Código de Barras`, `SKU`, `Descripción`, `U. por CasePack`, `Tienda XXXX × N` |
| UPC | int64 (estándar 13 dígitos) |

### MERCO

| Aspecto | Detalle |
|---|---|
| Ventas | Solo `fecha` (gregoriano). NO hay periodos. NO hay `precio_promedio` (calcular) |
| Ventas — columnas | `fecha`, `tienda_codigo`, `upc`, `venta_pesos`, `unidades` |
| Inventario | Encabezado dinámico (`Mes 05-2026 Tienda`, `Articulo`). Campo "Articulo" = `"UPC, NOMBRE"` → splittear |
| Inventario — columnas | `fecha`, `Mes XX-YYYY Tienda`, `Articulo`, `Inventario Precio a Costo`, `Inventario Unidades`, `Dias Inventario` |
| OC | Formato **LONG**: 1 fila = SKU. **Bulk a CEDIS** (no por tienda). Originalmente PDF → CSV |
| OC — granularidad | Bulk a CEDIS — no se sabe a qué tienda específica |
| OC — campos | `numero_oc`, `upc`, `descripcion`, `cantidad`, `unidad` (CAJA/BULTO), `contenido`, `total_uds`, `costo_total` |
| UPC | Mix: hay UPCs largos (13 dígitos) Y códigos internos cortos (`1290`, `9811`) — el adapter debe distinguir |

### Implicaciones

- **HEB → llena `purchase_order_lines.store_id`** porque sabe a qué tienda.
- **MERCO → deja `store_id = NULL`** porque es bulk a CEDIS. El esquema ya lo permite.
- **MERCO → calcula `price_avg` post-hoc** (`venta_pesos / unidades`) y lo guarda.
- **HEB → usa `period_code`** porque su calendario es fiscal. MERCO deja `period_code = NULL`.
- **MERCO → necesita parser PDF→CSV adicional** (script ya existe en `kam-data/`).

**El schema canónico ya soporta todas estas variantes.** No cambia ni una columna.

---

## Cuándo SÍ tocar el schema canónico

Solo si una cadena trae un concepto que **no existe** en ninguna otra y que **es crítico para el análisis**:

| Caso | ¿Tocar schema? |
|---|---|
| Cadena con calendario distinto (fiscal vs gregoriano) | NO — ya soportado via `chains.calendar_type` |
| Cadena bulk-a-CEDIS vs por-tienda | NO — `store_id` es nullable en `purchase_order_lines` |
| Cadena con OC en PDF | NO — el adapter convierte a CSV, canónico no sabe del formato |
| Cadena con campo "código departamento" | Probablemente NO — usar `metadata jsonb` en `products` |
| Cadena que reporta promociones aparte | SÍ — agregar tabla `promotions` (concepto nuevo, valioso, transversal) |
| Cadena que reporta mermas | SÍ — agregar tabla `shrinkage_events` si el cliente lo pide |

**Regla:** Si vas a agregar una columna, pregúntate "¿esto aplica a las demás cadenas potencialmente?" Si sí → schema. Si no → `metadata jsonb` en la tabla relevante.

---

## Versionado de adapters

Cada adapter lleva versión interna. Cuando una cadena cambia su formato (HEB cambia layout de OC, MERCO cambia headers):

```python
# ingest/heb/config.py
ADAPTER_VERSION = "2.0"  # bump cuando HEB cambie formato

EXPECTED_INVENTORY_COLUMNS = ['Fecha', 'ID_Tienda', 'UPC', ...]

def validate_format(df):
    actual = set(df.columns.tolist())
    expected = set(EXPECTED_INVENTORY_COLUMNS)
    missing = expected - actual
    if missing:
        raise ValueError(f"HEB adapter v{ADAPTER_VERSION} espera columnas {missing}. ¿Cambió el formato? Revisar.")
```

Si falla la validación, el script falla rápido y claro. NO inserta data corrupta.

---

## Trazabilidad: de canónico a fuente

Cada fila que entra a la BD lleva `ingestion_run_id`. Esa run sabe:
- Qué adapter (HEB v2.0)
- Qué archivo fuente
- Cuándo se procesó
- Quién lo disparó

Si un cliente dice "este número está mal", en 30 segundos sabes:
1. De qué `ingestion_run` viene
2. Qué archivo original
3. Qué adapter
4. Vas y revisas

```sql
select ir.source_file, ir.started_at, ir.status
from inventory_snapshots inv
join ingestion_runs ir on ir.id = inv.ingestion_run_id
where inv.id = 123456;
```

---

## Checklist para agregar cadena nueva (ej: Walmart)

Una vez maduro el sistema, esta es la receta:

- [ ] `insert into chains (slug, name, calendar_type) values ('walmart', 'Walmart', 'gregorian');`
- [ ] Crear carpeta `ingest/walmart/`
- [ ] Documentar formato real en `ingest/walmart/README.md`
- [ ] Implementar `load_stores.py`, `load_inventory.py`, `load_sales.py`, `load_po.py`
- [ ] Cada uno debe devolver `Canonical*` rows
- [ ] Test: cargar 1 archivo de cada tipo, validar conteos vs Excel original
- [ ] `chain_category_targets` si los cover_days para esta cadena son distintos
- [ ] El motor de sugeridos NO se toca — opera sobre canónico
- [ ] El frontend NO se toca — opera sobre canónico

**Tiempo realista por cadena nueva:** 2-3 semanas (incluyendo entender el formato, ajustar reglas de packaging, validar contra ground truth).

---

## Anti-patterns explícitos

❌ **NO crear `inventory_snapshots_heb` y `inventory_snapshots_merco`.** Mata el motor multi-cadena.

❌ **NO meter lógica de cadena en SQL functions.** El motor debe ser agnóstico. Si necesitas distinguir cadena, hazlo via parametros (`chain_category_targets`).

❌ **NO confiar en que UPCs son únicos cross-org.** Una cadena puede tener un UPC interno corto que choque con UPC real de otra org. UPC es único POR `org_id`.

❌ **NO parsear formatos en el cliente Next.js.** El frontend solo lee canónico. Si el archivo raw cambia, el cliente NO debe enterarse.

❌ **NO usar `metadata jsonb` como cajón de sastre.** Solo para campos genuinamente cadena-específicos que no se usarán en queries críticos.
