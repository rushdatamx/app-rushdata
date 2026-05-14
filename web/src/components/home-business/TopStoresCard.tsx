import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { fmtMXN, fmtNumber } from "@/lib/format";
import type { TopStoreRow } from "@/lib/queries/home-business";

export function TopStoresCard({ rows }: { rows: TopStoreRow[] }) {
  const max = Math.max(...rows.map((r) => r.revenue), 1);
  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <CardHeader className="px-6 py-4 border-b">
        <CardTitle className="text-base">Top tiendas · 12m</CardTitle>
        <CardDescription>Por venta sell-out (MXN) — excluye CEDIS</CardDescription>
      </CardHeader>
      <Table>
        <TableHeader>
          <TableRow className="bg-muted/30 hover:bg-muted/30">
            <TableHead className="w-10 pl-6">#</TableHead>
            <TableHead>Tienda</TableHead>
            <TableHead className="text-right">Unidades</TableHead>
            <TableHead className="text-right pr-6">Venta</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((s, i) => {
            const pct = (s.revenue / max) * 100;
            return (
              <TableRow key={s.id} className="group">
                <TableCell className="pl-6 font-mono tabular-nums text-muted-foreground">
                  {i + 1}
                </TableCell>
                <TableCell>
                  <Link
                    href={`/tiendas/${s.id}`}
                    className="block hover:text-foreground/80 transition-colors"
                  >
                    <div className="flex items-center gap-1.5">
                      <span className="font-medium">{s.name}</span>
                      <ArrowUpRight
                        className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                        strokeWidth={2}
                      />
                    </div>
                    {s.region && (
                      <div className="text-[11px] text-muted-foreground">
                        {s.region}
                      </div>
                    )}
                  </Link>
                </TableCell>
                <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                  {fmtNumber(s.units)}
                </TableCell>
                <TableCell className="text-right pr-6">
                  <div className="font-mono tabular-nums font-semibold text-right">
                    {fmtMXN(s.revenue)}
                  </div>
                  <div className="mt-1 h-1 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-foreground/70 rounded-full"
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </Card>
  );
}
