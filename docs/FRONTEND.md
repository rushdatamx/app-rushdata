# FRONTEND — Sistema de diseño RushData

> Estilo decidido: **Handle/Savio (data-dense)**, light mode primario con soporte dark opcional. Plus Jakarta Sans para UI, JetBrains Mono para números/códigos. Inspiración secundaria: Linear, Vercel dashboard, Notion.

---

## Filosofía visual

1. **Información antes que decoración.** Cada pixel pelea por su lugar. Números grandes y legibles, gráficas pequeñas e inline.
2. **Jerarquía por tamaño y peso, no por color.** El color es señal (verde/ámbar/rojo), no estética.
3. **Espacio en blanco generoso a nivel macro, denso a nivel micro.** Las cards respiran entre sí; dentro de la card la info es densa.
4. **Monospace para números.** Tipografía tabular alinea columnas automáticamente.
5. **Transitions sutiles, no animaciones.** Hover = 100ms cambio de color. Sin "bounce", sin "fade-up" en cada elemento.
6. **No ilustraciones, no emojis en UI.** Iconos lucide-react, monocromáticos.

---

## Stack frontend

```json
{
  "framework": "Next.js 15 (App Router)",
  "styling": "Tailwind CSS",
  "components": "shadcn/ui",
  "charts": "Tremor (primary) + Recharts (fallback)",
  "icons": "lucide-react",
  "fonts": ["Plus Jakarta Sans", "JetBrains Mono"],
  "data": "Supabase JS client (@supabase/ssr)",
  "forms": "react-hook-form + zod",
  "tables": "@tanstack/react-table",
  "state": "React Server Components + URL state (nuqs)",
  "deployment": "Vercel"
}
```

---

## Tokens de diseño

### Colores (light mode)

```css
--background: #FFFFFF;
--surface: #FAFAF9;           /* cards background */
--surface-hover: #F4F4F3;
--border: #E7E5E4;
--border-strong: #D6D3D1;
--foreground: #0C0A09;        /* texto principal */
--muted: #57534E;             /* texto secundario */
--muted-strong: #292524;
--subtle: #A8A29E;            /* texto terciario */

/* Accent (rushdata teal-blue) */
--accent: #0F766E;            /* teal-700 */
--accent-hover: #0D5E58;
--accent-soft: #CCFBF1;       /* badges */

/* Semánticos */
--success: #15803D;
--success-soft: #DCFCE7;
--warning: #B45309;
--warning-soft: #FEF3C7;
--danger: #B91C1C;
--danger-soft: #FEE2E2;
```

### Colores (dark mode — opcional v1.1)

```css
--background: #0C0A09;
--surface: #1C1917;
--surface-hover: #292524;
--border: #292524;
--foreground: #FAFAF9;
--muted: #A8A29E;
--accent: #14B8A6;            /* teal-500 más vivo en dark */
```

### Tipografía

```css
--font-sans: 'Plus Jakarta Sans', system-ui, sans-serif;
--font-mono: 'JetBrains Mono', 'SF Mono', monospace;

/* Escalas */
--text-display: 32px / 1.1 / -0.02em;   /* KPI principal */
--text-h1: 24px / 1.2 / -0.01em;
--text-h2: 18px / 1.3 / -0.005em;
--text-h3: 14px / 1.4 / 0;
--text-body: 13px / 1.5 / 0;
--text-small: 12px / 1.4 / 0;
--text-tiny: 11px / 1.3 / 0.02em;        /* labels uppercase */
--text-number-lg: 28px mono;             /* big KPI numbers */
--text-number-md: 18px mono;
--text-number-sm: 13px mono;             /* en tablas */
```

### Espaciado

Base 4px. Usar Tailwind defaults: `space-1` (4), `space-2` (8), `space-3` (12), `space-4` (16), `space-6` (24), `space-8` (32).

### Radio

```css
--radius-sm: 4px;
--radius-md: 6px;
--radius-lg: 8px;
--radius-card: 8px;    /* default cards */
```

### Sombras

Mínimas. Bordes hacen el trabajo.
```css
--shadow-card: 0 1px 2px rgba(0,0,0,0.04);
--shadow-popover: 0 4px 12px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.04);
```

---

## Layout principal

```
┌─────────────────────────────────────────────────────────────────┐
│ ▣ rushdata    [HEB ▼]              ⌘K     🔔   Mario P.  [Admin]│
├──────────┬──────────────────────────────────────────────────────┤
│          │                                                      │
│  Home    │         CONTENIDO PRINCIPAL                          │
│  Sugerido│                                                      │
│  Tiendas │         (max-width: 1440, padding 32)                │
│  Productos                                                      │
│  OC      │                                                      │
│          │                                                      │
│  ─────   │                                                      │
│  Ingesta │                                                      │
│  Equipo  │                                                      │
│  Ajustes │                                                      │
│          │                                                      │
└──────────┴──────────────────────────────────────────────────────┘
   220px              flex-1
```

### Sidebar

- Width 220px, fija, scroll independiente
- Sticky top, full height
- Background `--surface`, border-right
- Items con icono 16px + label 13px
- Active state: fondo `--accent-soft`, texto `--accent`
- Padding vertical 6px, horizontal 10px

### Topbar

- Height 56px, sticky, background `--background` + border-bottom
- Left: logo (text-only "rushdata" en mono) + selector cadena
- Center: command palette trigger (⌘K) — botón texto con teclas
- Right: notificaciones + avatar dropdown

---

## Las 4 vistas del MVP

### 1. Home — "Hoy"

```
┌─────────────────────────────────────────────────────────────────┐
│ Inicio · HEB                                       2026-05-12  │
│                                                                 │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ VENTA PERDIDA POTENCIAL ESTA SEMANA                         │ │
│ │                                                             │ │
│ │  $48,320 MXN                                  ▲ +12% vs P04 │ │
│ │  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━                            │ │
│ │  12 tiendas × 4 SKUs en riesgo                              │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ ┌────────────────┐ ┌────────────────┐ ┌────────────────┐       │
│ │ SUGERIDOS      │ │ QUIEBRES       │ │ FILL RATE      │       │
│ │ 47 pendientes  │ │ 14 activos     │ │ 87% promedio   │       │
│ │ $235k sugerido │ │ 8 críticos     │ │ ▼ -3pts        │       │
│ │ [Ver todos →]  │ │ [Ver todos →]  │ │ [Ver OC →]     │       │
│ └────────────────┘ └────────────────┘ └────────────────┘       │
│                                                                 │
│ ACCIONABLES PRIORITARIOS                                        │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │ #  Tienda          SKU           DDI  Sugerido    $ Riesgo │ │
│ │ 1  HEB Punta Norte Papa Fuego 45g  2  420 pzs    $ 8,400  │ │
│ │ 2  HEB Cumbres     Papa Sal 340g   0  240 pzs    $ 5,760  │ │
│ │ 3  HEB Galerías    Papa Jal 45g    4  420 pzs    $ 4,200  │ │
│ │ ...                                                         │ │
│ │ [Ver todos los 47 →]                                       │ │
│ └─────────────────────────────────────────────────────────────┘ │
│                                                                 │
│ TENDENCIA SELL-OUT (último periodo)                             │
│ ┌─────────────────────────────────────────────────────────────┐ │
│ │  Sparkline 8 semanas + barra ingresos por SKU              │ │
│ └─────────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

### 2. Sugeridos

Tabla principal con:
- Filtros sticky en top: Cadena · Tienda · Producto · Razón · Status
- Columnas: Tienda · Producto · DDI · Stock · Velocity · Sugerido (uds/cajas) · $ Riesgo · Confianza · Acciones
- Row expandible: muestra gráfica de inventario+venta 30 días
- Bulk actions: marcar como enviado, exportar Excel
- Toggle: "Solo críticos" / "Todos"

### 3. Tiendas

Grid de cards por tienda:
```
┌───────────────────────────────┐
│ HEB Punta Norte         #4521 │
│ Monterrey, NL                 │
│ ─────────────────────────     │
│  18  SKUs activos             │
│   3  quiebres   ⚠            │
│  $42,310 venta P04           │
│  84% fill rate ▼              │
└───────────────────────────────┘
```

Click → detail con todos los SKUs de esa tienda + timeline.

### 4. Productos

Lista de los 18 productos Delikos en HEB. Cada uno con:
- Venta acumulada periodo
- # tiendas activas / # con stockout
- Sparkline tendencia
- Click → heatmap tienda × semana

### 5. (Bonus) OC / Fill rate

Tabla de OCs con su fill rate, drill-down por tienda.

---

## Componentes clave (shadcn + custom)

### KPICard

```tsx
interface KPICardProps {
  label: string;              // "VENTA PERDIDA POTENCIAL"
  value: string;              // "$48,320 MXN"
  unit?: string;
  delta?: { value: string; direction: 'up' | 'down' };
  subtitle?: string;
  variant?: 'default' | 'danger' | 'success';
  href?: string;              // si es clickeable
}
```

Tamaño grande → display en home. Tamaño compacto → en cards de drilldown.

### DataTable

Custom sobre `@tanstack/react-table`:
- Columnas numéricas en mono, right-aligned
- Sort por click en header
- Row hover muestra acciones laterales
- Pagination minimal (`<` `1 de 12` `>`)
- Density toggle (cómoda / compacta)

### Sparkline

Mini SVG line chart, 80×24px, sin ejes, color según trend.

### SeverityBadge

```tsx
<SeverityBadge level="critical" />  // rojo "Crítico"
<SeverityBadge level="high" />       // ámbar "Alto"
<SeverityBadge level="medium" />     // gris "Medio"
```

### ConfidenceDot

Punto coloreado pequeño (●) indicando confidence del sugerido.

---

## Iconos

`lucide-react`, stroke 1.5, tamaño 16px default.

Mapping:
- Home → `LayoutDashboard`
- Sugeridos → `ShoppingCart`
- Tiendas → `Store`
- Productos → `Package`
- OC → `FileText`
- Ingesta → `Database`
- Equipo → `Users`
- Ajustes → `Settings`
- Notificaciones → `Bell`
- Buscar → `Search`

---

## Estados especiales

### Loading

- Skeleton boxes (no spinners) que respeten el shape final
- Color skeleton: `--surface-hover`

### Empty state

```
┌─────────────────────────────────────────────┐
│                                             │
│           [Icon 32px muted]                 │
│                                             │
│      Aún no hay sugeridos                   │
│   Se generan automáticamente cada noche.    │
│                                             │
│        [Recalcular ahora →]                 │
│                                             │
└─────────────────────────────────────────────┘
```

### Error

Banner rojo top, no modal. Toast para errores transitorios (use sonner).

---

## Responsive

MVP es **desktop-first**. Mobile = "información reducida" no "full app".

Breakpoints:
- `< 768px`: Mobile = solo Home con KPIs apilados + sugeridos top 10. Sidebar → drawer.
- `768-1280`: Tablet, sidebar colapsable.
- `> 1280`: Desktop full.

---

## Performance no-negociable

- TTFB < 200ms en Home (Vercel Edge + Supabase pooler)
- Páginas data-heavy usan Server Components con `revalidate: 60`
- Tablas grandes virtualizan con `@tanstack/react-virtual`
- Imágenes: solo logos, SVG inline

---

## Skills de diseño a aplicar

En cada sesión de UI, invocar:
- **`/frontend-design`** para review y mejoras visuales
- **`/tailwind-css-patterns`** para componentes complejos
- **`/simplify`** después de implementar features grandes

---

## Bibliotecas justificadas (no agregar sin razón)

| Necesidad | Librería | Por qué |
|---|---|---|
| Tablas complejas | `@tanstack/react-table` | Headless, sort/filter built-in |
| Charts | `tremor` | Hecho para dashboards data-dense |
| Forms | `react-hook-form` + `zod` | Performance + validación typed |
| Toasts | `sonner` | Default shadcn, sin config |
| Command palette | `cmdk` | Default shadcn |
| Date pickers | shadcn `Calendar` + `Popover` | Sin librería extra |
| State derivada del URL | `nuqs` | Filtros que sobreviven refresh |

---

## Anti-patrones a evitar

- ❌ Cards con gradientes
- ❌ Sombras grandes / glassmorphism
- ❌ Animaciones "bounce" o "fade-in" en lista de elementos
- ❌ Iconos colorinches o ilustraciones decorativas
- ❌ "Hero" image en home
- ❌ Modales gigantes para tareas comunes (preferir side panel)
- ❌ Tabs dentro de tabs
- ❌ Botones genéricos sin verbo (`Submit`, `OK`) — usar acción específica (`Generar sugeridos`)
