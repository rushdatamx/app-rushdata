import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { fmtMXN, fmtNumber } from "@/lib/format";
import type { StoreRow } from "@/lib/queries/stores";
import { storeStatus } from "@/components/tiendas/TiendasGrid";

const STATUS_BADGE: Record<
  ReturnType<typeof storeStatus>,
  { className: string; label: string }
> = {
  critical: {
    className: "bg-rose-100 text-rose-700 hover:bg-rose-100",
    label: "crítico",
  },
  warning: {
    className: "bg-amber-100 text-amber-700 hover:bg-amber-100",
    label: "atención",
  },
  healthy: {
    className: "bg-emerald-100 text-emerald-700 hover:bg-emerald-100",
    label: "sano",
  },
};

export function TiendasTable({ rows }: { rows: StoreRow[] }) {
  if (rows.length === 0) {
    return (
      <Card className="px-6 py-16 text-center">
        <div className="text-sm text-muted-foreground">
          Sin tiendas con esos filtros.
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="pl-6">Tienda</TableHead>
            <TableHead>Cluster</TableHead>
            <TableHead>Ubicación</TableHead>
            <TableHead>Estado</TableHead>
            <TableHead className="text-right">SKUs en stock</TableHead>
            <TableHead className="text-right">Quiebres</TableHead>
            <TableHead className="text-right">Venta 30d</TableHead>
            <TableHead className="text-right pr-6">Inv. valuado</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s) => {
            const status = storeStatus(s);
            const sb = STATUS_BADGE[status];
            const skusPct =
              s.skusActive === 0 ? 0 : (s.skusWithStock / s.skusActive) * 100;
            return (
              <TableRow key={s.id} className="group">
                <TableCell className="pl-6">
                  <Link
                    href={`/tiendas/${s.id}`}
                    className="block hover:text-foreground/80 transition-colors"
                  >
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{s.name}</span>
                      <ArrowUpRight
                        className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        strokeWidth={2}
                      />
                    </div>
                    {s.externalCode && (
                      <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                        #{s.externalCode}
                      </div>
                    )}
                  </Link>
                </TableCell>
                <TableCell>
                  {s.cluster ? (
                    <span className="inline-flex items-center px-1.5 py-0.5 rounded bg-muted text-[11px] text-muted-foreground font-mono tabular-nums">
                      C{s.cluster}
                    </span>
                  ) : (
                    <span className="text-muted-foreground/50">—</span>
                  )}
                </TableCell>
                <TableCell className="text-muted-foreground text-xs">
                  {s.city ? (
                    <>
                      {s.city}
                      {s.state ? `, ${s.state}` : ""}
                    </>
                  ) : (
                    "—"
                  )}
                </TableCell>
                <TableCell>
                  <Badge variant="secondary" className={sb.className}>
                    {sb.label}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="font-mono tabular-nums">
                    {fmtNumber(s.skusWithStock)}/{fmtNumber(s.skusActive)}
                  </div>
                  <div className="text-[11px] text-muted-foreground font-mono tabular-nums">
                    {skusPct.toFixed(0)}%
                  </div>
                </TableCell>
                <TableCell
                  className={`text-right font-mono tabular-nums ${
                    s.stockouts > 0 ? "text-rose-700 font-semibold" : "text-muted-foreground"
                  }`}
                >
                  {fmtNumber(s.stockouts)}
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums font-semibold">
                  {fmtMXN(s.revenue30d)}
                </TableCell>
                <TableCell className="text-right pr-6 font-mono tabular-nums text-muted-foreground">
                  {fmtMXN(s.inventoryValue)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
