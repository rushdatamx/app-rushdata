import Link from "next/link";
import { loadStores, type StoreRow } from "@/lib/queries/stores";
import { Card } from "@/components/ui/Card";
import { fmtMXN, fmtNumber, cn } from "@/lib/utils";
import { AlertTriangle } from "lucide-react";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ cluster?: string; region?: string }>;

function buildHref(current: { cluster?: string; region?: string }, patch: { cluster?: string | null; region?: string | null }) {
  const next: { cluster?: string; region?: string } = { ...current };
  if (patch.cluster === null) delete next.cluster;
  else if (patch.cluster !== undefined) next.cluster = patch.cluster;
  if (patch.region === null) delete next.region;
  else if (patch.region !== undefined) next.region = patch.region;

  const params = new URLSearchParams();
  if (next.cluster) params.set("cluster", next.cluster);
  if (next.region) params.set("region", next.region);
  const qs = params.toString();
  return qs ? `/tiendas?${qs}` : "/tiendas";
}

export default async function TiendasPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const current = { cluster: params.cluster, region: params.region };
  const { rows, clusters, regions, totals } = await loadStores(current);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-end justify-between gap-6">
        <div>
          <h1 className="text-[24px] leading-tight font-semibold text-foreground tracking-tight">
            Tiendas
          </h1>
          <p className="text-[13px] text-muted mt-1">
            {fmtNumber(totals.count)} ubicaciones · {fmtMXN(totals.revenue30d)} venta 30d · {fmtNumber(totals.stockouts)} quiebres activos
          </p>
        </div>
      </div>

      {/* Filtros */}
      <Card>
        <div className="px-5 py-3 flex flex-wrap items-center gap-x-6 gap-y-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[11px] uppercase tracking-wider text-subtle font-medium">Cluster</span>
            <Link
              href={buildHref(current, { cluster: null })}
              className={cn(
                "px-2.5 py-1 rounded-md text-[12px] transition-colors",
                !current.cluster
                  ? "bg-foreground text-background"
                  : "text-muted hover:bg-surface-hover hover:text-foreground"
              )}
            >
              Todos
            </Link>
            {clusters.map((c) => (
              <Link
                key={c}
                href={buildHref(current, { cluster: c })}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[12px] transition-colors font-mono tabular-nums",
                  current.cluster === c
                    ? "bg-foreground text-background"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                )}
              >
                {c}
              </Link>
            ))}
          </div>

          {regions.length > 1 && (
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] uppercase tracking-wider text-subtle font-medium">Región</span>
              <Link
                href={buildHref(current, { region: null })}
                className={cn(
                  "px-2.5 py-1 rounded-md text-[12px] transition-colors",
                  !current.region
                    ? "bg-foreground text-background"
                    : "text-muted hover:bg-surface-hover hover:text-foreground"
                )}
              >
                Todas
              </Link>
              {regions.map((r) => (
                <Link
                  key={r}
                  href={buildHref(current, { region: r })}
                  className={cn(
                    "px-2.5 py-1 rounded-md text-[12px] transition-colors",
                    current.region === r
                      ? "bg-foreground text-background"
                      : "text-muted hover:bg-surface-hover hover:text-foreground"
                  )}
                >
                  {r}
                </Link>
              ))}
            </div>
          )}
        </div>
      </Card>

      {/* Grid */}
      {rows.length === 0 ? (
        <Card>
          <div className="px-5 py-12 text-center text-[13px] text-muted">
            Sin tiendas con esos filtros.
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
          {rows.map((s) => (
            <StoreCard key={s.id} store={s} />
          ))}
        </div>
      )}
    </div>
  );
}

function StoreCard({ store: s }: { store: StoreRow }) {
  const hasStockouts = s.stockouts > 0;
  return (
    <Link
      href={`/tiendas/${s.id}`}
      className="group bg-surface border border-border rounded-lg hover:bg-surface-hover hover:border-border-strong transition-colors block"
      style={{ boxShadow: "0 1px 2px rgba(0,0,0,0.04)" }}
    >
      <div className="px-4 py-3 border-b border-border flex items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="text-[13px] font-medium text-foreground leading-tight truncate">
            {s.name}
          </div>
          <div className="text-[11px] text-subtle mt-0.5 flex items-center gap-1.5">
            {s.externalCode && <span className="font-mono tabular-nums">#{s.externalCode}</span>}
            {s.city && <span>· {s.city}{s.state ? `, ${s.state}` : ""}</span>}
          </div>
        </div>
        {s.cluster && (
          <span className="shrink-0 inline-flex items-center px-1.5 py-0.5 rounded bg-surface-hover text-[10px] text-muted-strong font-mono tabular-nums">
            {s.cluster}
          </span>
        )}
      </div>

      <div className="px-4 py-3 grid grid-cols-2 gap-3">
        <Metric label="SKUs en stock" value={`${fmtNumber(s.skusWithStock)} / ${fmtNumber(s.skusActive)}`} />
        <Metric
          label="Quiebres"
          value={fmtNumber(s.stockouts)}
          tone={hasStockouts ? "danger" : "muted"}
          icon={hasStockouts}
        />
        <Metric label="Venta 30d" value={fmtMXN(s.revenue30d)} />
        <Metric label="Inv. valuado" value={fmtMXN(s.inventoryValue)} />
      </div>
    </Link>
  );
}

function Metric({
  label,
  value,
  tone = "muted",
  icon = false,
}: {
  label: string;
  value: string;
  tone?: "muted" | "danger";
  icon?: boolean;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <div className="text-[10px] uppercase tracking-wider text-subtle font-medium">{label}</div>
      <div
        className={cn(
          "font-mono tabular-nums text-[14px] leading-tight inline-flex items-center gap-1",
          tone === "danger" ? "text-danger font-medium" : "text-foreground"
        )}
      >
        {icon && <AlertTriangle className="size-3" strokeWidth={2} />}
        {value}
      </div>
    </div>
  );
}
