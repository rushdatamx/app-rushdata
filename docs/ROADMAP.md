# ROADMAP — Calendario por semana

> Estimación realista asumiendo ~15-20 horas/semana de Mario en el proyecto (no full-time). Si tienes más tiempo, comprime; si menos, expande.

---

## Semana 1 (12–18 mayo 2026) — Foundation

**Objetivo:** Supabase corriendo con schema + seeds + 1 día de datos cargados.

- [ ] **L 12**: Crear cuentas (Supabase, Vercel, Resend), comprar/configurar dominio si falta
- [ ] **M 13**: Correr `00_schema.sql` y `01_seeds.sql`, validar RLS
- [ ] **X 14**: Setup proyecto Python `PORTAL/ingest/`, escribir `shared/db.py`
- [ ] **J 15**: Escribir `heb/load_stores.py`, cargar las 26 tiendas
- [ ] **V 16**: Escribir `heb/load_inventory.py`, cargar 1 día de inventario

**Checkpoint viernes:** `select count(*) from inventory_snapshots` devuelve >0.

---

## Semana 2 (19–25 mayo) — Ingesta completa + histórico

**Objetivo:** Toda la data de HEB Delikos en Supabase.

- [ ] **L 19**: `heb/load_sales.py`, cargar `venta-delikos.xls` completo
- [ ] **M 20**: `heb/load_po.py`, cargar OCs históricos
- [ ] **X 21**: Cargar inventarios históricos (últimos 30 días)
- [ ] **J 22**: Sanity checks contra reportes kam-data actuales
- [ ] **V 23**: Fix discrepancias si las hay

**Checkpoint viernes:** Mario corre query "venta P04-2026 por tienda" en Supabase y los números matchean su Excel actual.

---

## Semana 3 (26 mayo–1 junio) — Motor sugeridos

**Objetivo:** Motor genera sugeridos que Mario validaría como KAM.

- [ ] **L 26**: Escribir `sql/02_views.sql` (vistas auxiliares)
- [ ] **M 27**: `fn_compute_suggestions` v1
- [ ] **X 28**: `fn_compute_stockouts` + `fn_compute_daily_kpis`
- [ ] **J 29**: Setup pg_cron, test manual end-to-end
- [ ] **V 30**: Comparar 20 sugeridos del motor vs los que Mario haría → iterar

**Checkpoint viernes:** Mario aprueba que los sugeridos "se ven correctos" para al menos 80% de tienda×SKU.

---

## Semana 4 (2–8 junio) — Frontend foundation

**Objetivo:** Login + sidebar + página home con datos reales.

- [ ] **L 2**: Scaffold Next.js + shadcn + tokens de diseño
- [ ] **M 3**: Auth flow magic link funcionando
- [ ] **X 4**: Layout (sidebar + topbar + chain switcher)
- [ ] **J 5**: KPICard component + integración Supabase
- [ ] **V 6**: Home con 3 KPIs principales + tabla accionables

**Checkpoint viernes:** Mario hace login en `localhost:3000` y ve KPIs reales.

---

## Semana 5 (9–15 junio) — Vistas principales

**Objetivo:** Sugeridos, Tiendas, Productos funcionales.

- [ ] **L 9**: Página Sugeridos — tabla principal
- [ ] **M 10**: Sugeridos — filtros (nuqs) + detail drawer
- [ ] **X 11**: Página Tiendas (grid + detail)
- [ ] **J 12**: Página Productos (lista + heatmap)
- [ ] **V 13**: Review estético con `/frontend-design`

**Checkpoint viernes:** Mario puede navegar las 4 vistas y todo carga rápido.

---

## Semana 6 (16–22 junio) — Polish + Deploy

**Objetivo:** Producción en `app.rushdata.com.mx`.

- [ ] **L 16**: Edge Function email diario con Resend
- [ ] **M 17**: Empty states, loading skeletons, errores
- [ ] **X 18**: Deploy a Vercel, configurar dominio
- [ ] **J 19**: Smoke test E2E en producción
- [ ] **V 20**: Documentar issues encontrados

**Checkpoint viernes:** Producto live, Mario recibe email diario.

---

## Semanas 7–8 (23 junio–6 julio) — Dogfood

**Objetivo:** Mario usa PORTAL en lugar de kam-data.

- Semana 7: Ambos en paralelo, identificar fricciones
- Semana 8: Solo PORTAL, iterar bugs

**Checkpoint:** Mario dice "ya no abro kam-data" → producto listo para cliente externo.

---

## Semana 9+ — Primer cliente externo

Plan separado dependiendo del cliente que entre. Tareas posibles:
- Onboarding manual del cliente
- Carga de su catálogo de productos
- Configurar accesos
- Acompañamiento primer mes

---

## Velocidad esperada después del MVP

Una vez que MVP esté en producción, agregar **una cadena nueva** debería tomar:

- **Semana 1**: Adaptar ingesta (entender formato del nuevo retailer)
- **Semana 2**: Validar motor con la data nueva (ajustar cover_target_days, packaging, etc.)
- **Semana 3**: QA + onboarding

**Total: 2-3 semanas por cadena nueva.** Si toma más, algo en el schema canónico no quedó bien y debemos rediseñar — flag de alerta.

---

## Riesgos y mitigaciones

| Riesgo | Probabilidad | Mitigación |
|---|---|---|
| Mario no tiene tiempo suficiente | Alta | Planear sesiones de bloques 4h, no entrar al detalle si solo hay 1h |
| Motor genera sugeridos "raros" en edge cases | Media | Comparar contra ground truth (kam-data outputs) en cada cambio |
| HEB cambia formato de archivos | Media | Script de ingesta versionado, errores claros si formato no coincide |
| Cliente externo tiene catálogo inmenso (1000+ SKUs) | Media | Schema soporta; performance hay que validar con índices y materialized views |
| Supabase free tier insuficiente | Baja | $25/mes Pro, no es bloqueante |
| Querer agregar features antes del dogfood | Alta (lo más común) | DISCIPLINA: si no es para Delikos en MVP, va a backlog |

---

## Backlog (post-MVP, NO MVP)

Cosas tentadoras pero fuera de MVP:

- 🚫 Multi-cadena en mismo dashboard (un cliente con HEB + MERCO)
- 🚫 Roles granulares (solo admin vs viewer por ahora)
- 🚫 Comentarios colaborativos en sugeridos
- 🚫 Exportar a PDF / PowerPoint
- 🚫 Mobile app
- 🚫 Integraciones con Slack/WhatsApp
- 🚫 IA "explica este número" en lenguaje natural
- 🚫 Forecasting con modelos ML
- 🚫 Marketplace de retailers (cada cliente activa los suyos)
- 🚫 Self-service onboarding

Cada uno suena bien. Cada uno mata el MVP si se mete antes.
