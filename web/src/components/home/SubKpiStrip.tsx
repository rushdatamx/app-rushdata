import { Card } from "@/components/ui/card";
import { fmtNumber, fmtDecimal, fmtMXN } from "@/lib/format";

export type SubKpiStripProps = {
  avgDdi: number | null;
  activeStores: number;
  activeProducts: number;
  activePOs: number;
  inventoryValue: number;
};

export function SubKpiStrip({
  avgDdi,
  activeStores,
  activeProducts,
  activePOs,
  inventoryValue,
}: SubKpiStripProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      <StatCard
        label="Cobertura promedio"
        value={avgDdi == null ? "—" : fmtDecimal(avgDdi)}
        unit="días"
      />
      <StatCard
        label="Tiendas activas"
        value={fmtNumber(activeStores)}
        unit="puntos de venta"
      />
      <StatCard
        label="SKUs activos"
        value={fmtNumber(activeProducts)}
        unit="vendiéndose"
      />
      <StatCard
        label="Inventario valuado"
        value={fmtMXN(inventoryValue)}
        unit={`${activePOs} OC en tránsito`}
      />
    </div>
  );
}

function StatCard({ label, value, unit }: { label: string; value: string; unit: string }) {
  return (
    <Card className="p-5 gap-1">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div className="mt-1 font-mono tabular-nums text-2xl font-semibold tracking-tight">
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{unit}</div>
    </Card>
  );
}
