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
import type { TopStore, TopProduct } from "@/lib/queries/po";

export function OCTopLists({
  topStores,
  topProducts,
}: {
  topStores: TopStore[];
  topProducts: TopProduct[];
}) {
  const maxStoreValue = Math.max(...topStores.map((s) => s.value), 1);
  const maxProductValue = Math.max(...topProducts.map((p) => p.value), 1);
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <Card className="p-0 gap-0 overflow-hidden">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-base">Top tiendas por valor</CardTitle>
          <CardDescription>Histórico completo de OCs</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10 pl-6">#</TableHead>
              <TableHead>Tienda</TableHead>
              <TableHead className="text-right">OCs</TableHead>
              <TableHead className="text-right pr-6">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topStores.map((s, i) => {
              const pct = (s.value / maxStoreValue) * 100;
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
                      {s.cluster && (
                        <div className="text-[11px] text-muted-foreground">
                          Cluster {s.cluster}
                        </div>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(s.poCount)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="font-mono tabular-nums font-semibold text-right">
                      {fmtMXN(s.value)}
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

      <Card className="p-0 gap-0 overflow-hidden">
        <CardHeader className="px-6 py-4 border-b">
          <CardTitle className="text-base">Top productos por valor</CardTitle>
          <CardDescription>Histórico completo de OCs</CardDescription>
        </CardHeader>
        <Table>
          <TableHeader>
            <TableRow className="bg-muted/30 hover:bg-muted/30">
              <TableHead className="w-10 pl-6">#</TableHead>
              <TableHead>Producto</TableHead>
              <TableHead className="text-right">OCs</TableHead>
              <TableHead className="text-right pr-6">Valor</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {topProducts.map((p, i) => {
              const pct = (p.value / maxProductValue) * 100;
              return (
                <TableRow key={p.id} className="group">
                  <TableCell className="pl-6 font-mono tabular-nums text-muted-foreground">
                    {i + 1}
                  </TableCell>
                  <TableCell>
                    <Link
                      href={`/productos/${p.id}`}
                      className="block hover:text-foreground/80 transition-colors"
                    >
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium">{p.name}</span>
                        <ArrowUpRight
                          className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity"
                          strokeWidth={2}
                        />
                      </div>
                      {p.category && (
                        <div className="text-[11px] text-muted-foreground capitalize">
                          {p.category}
                        </div>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-right font-mono tabular-nums text-muted-foreground">
                    {fmtNumber(p.poCount)}
                  </TableCell>
                  <TableCell className="text-right pr-6">
                    <div className="font-mono tabular-nums font-semibold text-right">
                      {fmtMXN(p.value)}
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
    </div>
  );
}
