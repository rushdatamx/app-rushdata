# FRONTEND — Sistema de diseño RushData

> **Lenguaje:** Handle/Savio data-dense, light mode, charcoal primary + emerald success. **shadcn/ui** sobre **Tailwind v4** + **Plus Jakarta Sans** (UI) + **JetBrains Mono** (números). Charts con **Recharts** vía shadcn `chart`.

Última revisión: 2026-05-14 · Mantén este doc cuando agregues vistas o cambies tokens.

---

## 1 · Filosofía

1. **Información antes que decoración.** Cada pixel pelea. Números grandes, charts pequeños inline, copy minimal.
2. **Jerarquía por tamaño y peso, no por color.** Color = señal (verde/ámbar/rojo). No es estética.
3. **Cada vista responde una pregunta KAM.** Antes de diseñar, pregunta: *"¿qué hace el usuario con esto a las 8am?"*. Si no hay respuesta clara → la vista no merece existir.
4. **Monospace para números.** `font-mono tabular-nums` alinea columnas y comunica "esto es dato, no copy".
5. **Transitions sutiles.** Hover 150-200ms de color. Cero bounce, fade-up, scale.
6. **Sin emojis en UI** (excepto los del filtro de status para ayudar a escanear). Iconos lucide-react monocromáticos, `strokeWidth={1.75-2}`.

---

## 2 · Stack y dependencias clave

- **Next.js 16** (App Router, RSC default) — `searchParams` y `params` son `Promise<...>`, siempre await
- **React 19** + **Tailwind v4** (con `@theme inline`) + **TypeScript 5**
- **shadcn/ui** (New York style, neutral base) en `src/components/ui/*` — NO editar directamente, regenerar con `npx shadcn@latest add <component>`
- **Recharts 3** wrappeado en `chart.tsx` (shadcn)
- **lucide-react** para iconos
- **@supabase/ssr** para cliente server con RLS por JWT

---

## 3 · Tokens de color

Definidos en `src/app/globals.css`. **No hardcodear hex en componentes** — siempre usar las classes/vars.

### Paleta semántica

| Token | HSL | Uso |
|---|---|---|
| `--primary` | `240 10% 6%` | Charcoal casi negro · CTAs, sticky bars, dots de status sano |
| `--background` | `0 0% 100%` | Fondo principal |
| `--foreground` | `240 10% 4%` | Texto principal |
| `--muted` | `240 5% 96%` | Card backgrounds suaves, tablas header |
| `--muted-foreground` | `240 4% 46%` | Texto secundario |
| `--border` | `240 6% 90%` | Dividers, card borders |
| `--destructive` | `0 72% 51%` | Errores, quiebres críticos |
| `--ring` | `240 10% 6%` | Focus ring |

### Paleta de chart (`--chart-1` … `--chart-5`)

| Var | Color | Uso típico |
|---|---|---|
| `--chart-1` | emerald `158 64% 40%` | Datos positivos (venta capturada, top SKU, sano) |
| `--chart-2` | rose `0 72% 51%` | Datos negativos (venta perdida, quiebres) |
| `--chart-3` | amber `38 92% 50%` | Atención (DDI bajo, fill rate medio) |
| `--chart-4` | sky `217 91% 60%` | Comparación (pedido vs recibido = sky vs emerald) |
| `--chart-5` | violet `271 81% 56%` | Categorías secundarias |

### Estados de severidad (badges)

Convención fija en TODA la app. Si la cambias, busca y reemplaza:

```tsx
critical: "bg-rose-100 text-rose-700"     // 🔴 DDI ≤ 1 · 3+ quiebres
high:     "bg-amber-100 text-amber-800"   // 🟠 DDI ≤ 3
medium:   "bg-amber-50 text-amber-700"    // 🟡 DDI ≤ 7
low:      "bg-emerald-50 text-emerald-700" // 🟢 DDI > 7
```

### Reglas de tone en KPIs

Cuando un KPI tenga "tono" (success/warning/danger), aplica esta tabla:

```tsx
TONE = {
  default: { value: "text-foreground", chip: "bg-muted text-muted-foreground" },
  danger:  { value: "text-rose-700",   chip: "bg-rose-100 text-rose-700" },
  success: { value: "text-emerald-700",chip: "bg-emerald-100 text-emerald-700" },
  warning: { value: "text-amber-700",  chip: "bg-amber-100 text-amber-700" },
}
```

---

## 4 · Tipografía

| Uso | Class | Ejemplo |
|---|---|---|
| H1 página | `text-3xl lg:text-4xl font-semibold tracking-tight` | "Bienvenido, Mario" |
| H2 sección (CardTitle) | `text-base` (shadcn default) | "Accionables prioritarios" |
| Label uppercase | `text-[10px] uppercase tracking-wider text-muted-foreground font-medium` | "VENTA 30D" |
| Valor grande KPI | `font-mono tabular-nums text-2xl lg:text-3xl font-semibold tracking-tight` | "$1,234,567" |
| Valor hero | `font-mono tabular-nums text-3xl lg:text-4xl font-semibold tracking-tight` | (mismo, más grande) |
| Body | `text-sm` o `text-xs` | Subtitles, descriptions |
| Tabular cell num | `font-mono tabular-nums` | Toda celda numérica |
| Muted | `text-muted-foreground` | Sub-info, secondary |

**Regla:** todo número que se compara visualmente debe ser `font-mono tabular-nums`. Texto descriptivo va en `text-sm` o `text-xs`.

---

## 5 · El patrón "página estándar"

Toda vista de listado sigue esta estructura. Replícala para nuevas pestañas.

```
┌──────────────────────────────────────────┐
│ Header (h1 + subtitle + acción opc.)     │
├──────────────────────────────────────────┤
│ Hero Card (grid lg:5)                    │
│  ├─ col-span-3: Chart + KPI principal    │
│  └─ col-span-2: 4 KPI sub-blocks         │
├──────────────────────────────────────────┤
│ Filter bar (URL state)                   │
│  └─ "Mostrando X de Y" debajo            │
├──────────────────────────────────────────┤
│ Vista principal: Tabla | Grid            │
└──────────────────────────────────────────┘
```

### Hero card — anatomía

`<Card className="p-0 gap-0 overflow-hidden">` con `grid grid-cols-1 lg:grid-cols-5`:

- **Izquierda (col-span-3, p-6, lg:border-r):**
  - Mini label uppercase + descripción una línea
  - Valor grande mono
  - Chart 180-260px de altura
- **Derecha (col-span-2):** `grid grid-cols-1 sm:grid-cols-2 divide-x divide-y` con 4 `KpiBlock`s.
  - Cada KpiBlock: label uppercase + icon chip + valor + sub. Si tone="danger"/"success" colorea valor + chip.
  - Si el KpiBlock lleva a otra ruta, envuélvelo en `<Link>` con `hover:bg-muted/40 transition-colors` (ej. en `/tiendas` el "Top tienda" lleva al detail).

### Filter bar — convención URL state

Cada filtro escribe un search param. **Param nulo cuando es default** (no `?status=all`, sino sin el param).

| Ruta | Params soportados |
|---|---|
| `/` | `period` (rolling 7d/30d/90d · calendario `cal:YYYY-MM` / `cal:YYYY` / `cal:ytd` · fiscal HEB `fis:P##-YYYY` / `fis:YYYY` / `fis:ytd`), `chain`, `cur` (MXN/USD) |
| `/sugeridos` | `reason`, `severity` (critical), `cluster`, `q` |
| `/forecast` | — (sin filtros aún; futura iteración: `horizon`, `category`) |
| `/tiendas` | `cluster`, `region`, `status` (critical/warning/healthy), `q`, `view` (grid/table) |
| `/productos` | `cat`, `status` (star/risk/dormant), `q`, `view` (grid/table) |
| `/oc` | `status` (pending/partial/fulfilled/cancelled), `period` (rolling/calendario/fiscal + `all`), `q` |

Patrón del client component:

```tsx
const router = useRouter();
const pathname = usePathname();
const sp = useSearchParams();
const [isPending, startTransition] = useTransition();

const updateParams = (patch: Record<string, string | null>) => {
  const params = new URLSearchParams(sp?.toString() ?? "");
  for (const [k, v] of Object.entries(patch)) {
    if (v === null || v === "" || v === "all") params.delete(k);
    else params.set(k, v);
  }
  const qs = params.toString();
  startTransition(() => router.push(qs ? `${pathname}?${qs}` : pathname));
};
```

Para search input: `useState` local + `useEffect` con `setTimeout(300)` para debounce.

### Chips de filtro con contador — patrón estándar

A partir de 2026-05-14, los filtros de categoría/status se renderizan como **chips con contador inline** en vez de `<Select>`. Más densos, más escaneables, el KAM ve cuántos elementos hay en cada filtro antes de clicar.

**Backend:** la query devuelve `Record<FilterKey, number>` con conteos sobre el universo SIN el filtro propio (sí con otros filtros). Ejemplo en `/sugeridos`:

```ts
// loadSuggestions ignora el filtro de reason al contar reasonCounts
const reasonCounts: ReasonCounts = {
  all: totalAll, stockout_risk: 0, low_ddi: 0, velocity_up: 0, periodic_replenish: 0,
};
for (const r of allRows) {
  if (r.reason_code in reasonCounts) reasonCounts[r.reason_code] += 1;
}
```

**Renderizado del chip:**

```tsx
{CHIPS.map((c) => {
  const count = counts[c.value] ?? 0;
  // ocultar chips no-"all" sin elementos (a menos que estén activos)
  if (c.value !== "all" && count === 0 && active !== c.value) return null;
  const isActive = active === c.value;
  return (
    <button
      key={c.value}
      type="button"
      onClick={() => updateParams({ [paramKey]: c.value })}
      className={cn(
        "h-8 pl-3 pr-2 rounded-md text-xs font-medium transition-colors inline-flex items-center gap-2 border",
        isActive
          ? c.activeBg ?? "bg-primary text-primary-foreground border-primary"
          : "bg-background hover:bg-muted"
      )}
    >
      {c.dot && (
        <span className={cn("size-2 rounded-full", isActive ? "bg-white/80" : c.dot)} />
      )}
      <span>{c.label}</span>
      <span className={cn(
        "inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded text-[10px] font-mono tabular-nums",
        isActive ? "bg-white/15 text-white" : "bg-muted text-muted-foreground"
      )}>
        {count}
      </span>
    </button>
  );
})}
```

**Convención de `activeBg` por semántica:**
- danger/crítico → `bg-rose-600 text-white border-rose-600`
- warning/atención → `bg-amber-600 text-white border-amber-600`
- success/sano → `bg-emerald-600 text-white border-emerald-600`
- accent (star, etc.) → `bg-amber-600 text-white border-amber-600`
- neutral (dormant, cancelled) → `bg-foreground text-background border-foreground`
- "all" sin tono → `bg-primary text-primary-foreground border-primary`

**Vistas que usan este patrón:** `/sugeridos` (razones), `/tiendas` (status), `/productos` (status), `/oc` (status). Los filtros que NO son enum acotado (clusters, regiones, categorías) siguen como `<Select>`.

### Selector de período dual (rolling · calendario · fiscal)

A partir de 2026-05-14, el filtro de período en `/` usa el componente `<PeriodSelector>` (en `components/shared/`) con tres columnas: **Rolling** (7d/30d/90d), **Calendario** (mes actual + 5 anteriores, año anterior, YTD) y **Fiscal HEB** (últimos 6 períodos P##, años fiscales completos, FY YTD). La columna fiscal se oculta cuando la cadena activa no tiene calendario fiscal (`chain_calendars`).

**Helper backend:** `lib/period.ts` con `loadFiscalPeriods(chainSlug)`, `resolvePeriod(raw, fiscalPeriods)` y `buildPeriodOptions(fiscalPeriods)`. Devuelve `{ start, end, days, label, shortLabel, mode }`. Las queries que consumían `days: number` deben migrarse a `(startIso, endIso)` — ejemplo: `loadHomeTimeSeries` ya migrada.

**Param URL:** `?period=<raw>` donde raw es `7d|30d|90d` (rolling), `cal:YYYY-MM|cal:YYYY|cal:ytd` (calendario), `fis:P##-YYYY|fis:YYYY|fis:ytd` (fiscal). Sin param → 30d. Si el raw es inválido o el calendario fiscal no aplica → fallback a 30d.

**Variante `includeAll`:** el selector acepta `includeAll` + `defaultValue="all"` para vistas que quieran ofrecer "Todo el histórico" como default (ej. `/oc`). Cuando `period === "all"`, las queries deben omitir el filtro de fecha.

**Vistas con el selector dual hoy:** `/` (default 30d), `/oc` (default "all"). **Pendiente:** `/forecast` (requiere refactor del modelo comparativo YoY/MoM relativos a período), `/productos` y `/tiendas` (requieren refactor de `fn_product_kpis` y `fn_store_kpis` SQL para aceptar rangos de fecha — se aborda en Feature 4 histórico multi-año).

### Tabla shadcn — convenciones

```tsx
<Card className="p-0 gap-0 overflow-hidden">
  <CardHeader className="px-6 py-4 border-b">
    <CardTitle className="text-base">…</CardTitle>
    <CardDescription>…</CardDescription>
  </CardHeader>
  <Table>
    <TableHeader>
      <TableRow className="bg-muted/30 hover:bg-muted/30">
        <TableHead className="pl-6">…</TableHead>
        <TableHead className="text-right pr-6">…</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.map(r => (
        <TableRow key={r.id} className="group">
          <TableCell className="pl-6">
            <Link className="block hover:text-foreground/80">
              {name}
              <ArrowUpRight className="opacity-0 group-hover:opacity-100" />
            </Link>
          </TableCell>
          <TableCell className="text-right pr-6 font-mono tabular-nums font-semibold">
            {fmtMXN(r.value)}
          </TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
</Card>
```

**Reglas:**
- Primera celda: `pl-6`. Última celda: `pr-6`. Las demás default (`p-2` shadcn).
- Header con `bg-muted/30` y `hover:bg-muted/30` (evita hover propio).
- Filas con `group` para revelar `ArrowUpRight` en hover.
- Toda celda numérica: `text-right font-mono tabular-nums`. Si es la métrica clave de la fila, `font-semibold`.
- Quiebres / valores negativos: `text-rose-700 font-semibold`.

### Grid cards — convenciones

`<Card className="p-0 gap-0 overflow-hidden hover:border-foreground/20 transition-colors h-full">` envuelto en `<Link>` con `focus:outline-none focus:ring-2 focus:ring-ring`.

Estructura:
1. Header (border-b): nombre + status dot + cluster badge
2. Body grid 2x2 con métricas
3. Footer (border-t, bg-muted/20): status badge + métrica secundaria

---

## 6 · Convenciones retail (no-obvio del código)

### Status de tienda (`storeStatus()` en `TiendasGrid.tsx`)
- **critical:** `stockouts >= 3` → 🔴
- **warning:** `stockouts >= 1` → 🟡
- **healthy:** `stockouts === 0` → 🟢

### Status de producto (`statusOf()` en `productos/page.tsx`)
- **star:** `revenue30d >= cutoff` donde cutoff = revenue del SKU en posición top 20% → ⭐
- **risk:** `storesWithStockout > 0` → 🔴
- **dormant:** `units30d === 0 && revenue30d === 0` → 💤
- **normal:** todo lo demás → 🟢

### Severidad de DDI (`ddiSeverity()`, idéntica en todos los archivos)
- `ddi <= 1` → critical
- `ddi <= 3` → high
- `ddi <= 7` → medium
- `ddi > 7` → low

### Fill rate de OC
- `>= 95%` → success (verde)
- `90-95%` → warning (amarillo)
- `< 90%` → danger (rojo + icon `AlertTriangle`)

### Concentración top 3 SKUs (productos) / top 5 tiendas
- Umbral warning: `> 60%` (riesgo de dependencia)
- Umbral danger: `> 80%`

### Cobertura del catálogo (semanas)
- `coverageWeeks = inventoryValue / (revenue30d / (30/7))`
- `< 1 sem` → danger
- `1–2 sem` → warning
- `> 2 sem` → success

### Margen 30d (productos)
- `marginPct = sum(revenue30d - unitCost * units30d) / sum(revenue30d) * 100`
- `>= 25%` → success
- `15–25%` → default
- `< 15%` → warning

### MAPE / Precisión forecast
- `accuracy = 100 - MAPE`
- `>= 85%` → success
- `70–85%` → warning
- `< 70%` → danger

### Trend semanal (productos)
- `|delta| < 2%` → estable (gray `Minus` icon)
- `delta > 0` → ↑ verde
- `delta < 0` → ↓ rojo

**Si cambias un umbral, busca el helper en todos los archivos** — están copiados, no abstraídos en una sola función.

---

## 7 · Server actions y revalidación

Patrón en `src/app/sugeridos/actions.ts`:

```ts
"use server";
import { revalidatePath } from "next/cache";

export async function markSuggestionsSent(ids: string[]) {
  const { orgId, role } = await verifySession();
  if (role === "viewer") return { ok: false, error: "Sin permisos" };

  const db = await supabaseServer({ allowSetCookies: true });
  const { error, count } = await db.from("…").update({…}).in("id", ids);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/sugeridos");
  revalidatePath("/");                 // si afecta home
  return { ok: true, updated: count };
}
```

**Reglas:**
- Siempre `verifySession()` primero
- Siempre check de role (`viewer` no muta)
- `supabaseServer({ allowSetCookies: true })` cuando se va a escribir
- `revalidatePath` de todas las rutas que se ven afectadas
- Devolver `{ ok: true | false, ... }` para que el client maneje el toast

---

## 8 · Loading skeletons y not-found

Componentes en `src/components/shared/PageSkeletons.tsx`:
- `HeaderSkeleton`, `HeroSkeleton`, `FiltersSkeleton`, `TableSkeleton`, `GridSkeleton`, `StripSkeleton`

Cada ruta tiene su `loading.tsx` que compone estos skeletons en la estructura de la página real (Next 16 los muestra automáticamente durante navegación).

`not-found.tsx` por ruta cuando hace falta UX específica:
- `/tiendas/[id]/not-found.tsx`, `/productos/[id]/not-found.tsx` — back link + icon + CTA
- `/not-found.tsx` global — fallback

---

## 9 · Estructura de archivos

```
web/src/
├── app/
│   ├── layout.tsx              # SidebarProvider + AppSidebar + AppTopbar shell
│   ├── page.tsx                # Home (dashboard)
│   ├── loading.tsx             # Home skeleton
│   ├── not-found.tsx           # 404 global
│   ├── globals.css             # Tokens + body font fix
│   ├── sugeridos/
│   │   ├── page.tsx
│   │   ├── actions.ts          # server action markSuggestionsSent
│   │   └── loading.tsx
│   ├── forecast/
│   │   ├── page.tsx
│   │   └── loading.tsx
│   ├── tiendas/
│   │   ├── page.tsx
│   │   ├── loading.tsx
│   │   └── [id]/
│   │       ├── page.tsx
│   │       ├── loading.tsx
│   │       └── not-found.tsx
│   └── productos/, oc/         # mismo patrón
├── components/
│   ├── ui/                     # shadcn (no editar a mano)
│   ├── layout/                 # AppSidebar, AppTopbar
│   ├── home/                   # HeroChart, SubKpiStrip, PriorityTable, LostSaleLedger, HomeHeader
│   ├── sugeridos/              # SugeridosHero (severity bar)/Filters (chips)/Table
│   ├── forecast/               # ForecastHero (ComposedChart)/SubKpis/Table
│   ├── tiendas/                # TiendasHero/Filters (chips)/Grid/Table + StoreDetailHero
│   ├── productos/              # ProductosHero/Filters (chips)/Grid/Table + ProductDetailHero + MiniSparkline
│   ├── oc/                     # OCHero/Filters (chips)/TopLists/RecentTable
│   └── shared/                 # PageSkeletons
└── lib/
    ├── format.ts               # fmtMXN, fmtNumber, fmtDecimal, fmtPct
    ├── utils.ts                # cn() solo
    ├── dal.ts                  # verifySession, getSessionSoft
    ├── supabase/ssr.ts
    └── queries/                # un archivo por vista (home.ts, suggestions.ts, …)
```

---

## 10 · Playbook: agregar una vista nueva

Pasos para agregar `/[nueva-vista]` siguiendo el patrón:

1. **Define la pregunta KAM** que responde la vista. Si no hay → para.
2. **Crea la query** en `lib/queries/[nueva].ts` devolviendo `{ rows, totals, ... }` con tipo explícito.
3. **Crea carpeta** `components/[nueva]/` con:
   - `[Nueva]Hero.tsx` (client) — chart + 4 KPIs
   - `[Nueva]Filters.tsx` (client) — URL state + debounced search
   - `[Nueva]Table.tsx` (server) y/o `[Nueva]Grid.tsx` (server)
4. **Crea** `app/[nueva]/page.tsx` con `searchParams: Promise<{…}>`, fetch en parallel, filter en memoria si N pequeño.
5. **Agrega** `app/[nueva]/loading.tsx` componiendo skeletons.
6. **Agrega el item al sidebar** en `components/layout/AppSidebar.tsx` (en el grupo correcto: PRINCIPAL / CATÁLOGO / DATOS).
7. **Verifica** `npm run build` clean + smoke test (`curl localhost:3003/[nueva]`).

---

## 11 · Cosas a NO hacer

- ❌ Editar componentes en `components/ui/*` a mano — regenera con shadcn CLI.
- ❌ Hardcodear hex (`#0F766E`) — usa CSS vars (`hsl(var(--chart-1))`) o tailwind classes (`text-emerald-700`).
- ❌ `font-family: Arial` en `body` — el bug que tenía el `globals.css` original. La fuente es Plus Jakarta vía CSS var.
- ❌ Importar `@/components/ui/Card` (PascalCase) — shadcn instala lowercase. macOS engaña porque APFS es case-insensitive, pero Turbopack es case-sensitive.
- ❌ Usar `service_role` en el cliente. Server actions OK con `supabaseServer({ allowSetCookies: true })`.
- ❌ Agregar emojis en UI sin razón — la única excepción son los emojis en SelectItem labels (filtros de status) porque ayudan a escanear.
- ❌ `<table className="…">` raw HTML — usa shadcn `<Table>` para consistencia.

---

## 12 · Roadmap visual pendiente

- [ ] `app.rushdata.com.mx` (DNS pendiente)
- [ ] Dark mode (tokens ya soportan `.dark` variant)
- [ ] Sortable columns en tablas
- [ ] Paginación cuando los datasets crezcan (hoy todo es client-side filter sobre <300 rows)
- [ ] Detail drawer/sheet en /sugeridos (click fila → side panel con histórico) — el patrón de shadcn `Sheet` ya está instalado
- [ ] Toggle agrupar /sugeridos por Producto (consolidado tipo Celes) — "Total a pedir Papa 45g: 1,840 un en 12 tiendas"
- [ ] Export CSV global (hoy solo en /sugeridos)
- [ ] Export CSV en `/forecast` para que Mario comparta con su jefe
- [ ] Heatmap tienda × SKU (vista nueva `/cobertura`)
- [ ] Validar forecast contra datos reales (Delikos) — si MAPE > 30% en un SKU, mostrar warning inline
- [ ] Filtros en `/forecast`: `horizon` (30/60/90d), `category`, `chain`
- [ ] Tour visual / onboarding interactivo para nuevos clientes prospecto
