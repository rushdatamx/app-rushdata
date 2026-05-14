import { Card } from "@/components/ui/card";
import { fmtMXN, fmtNumber } from "@/lib/format";

export type ForecastSubKpisProps = {
  last30dRevenue: number;
  last30dUnits: number;
  prev30dRevenue: number;
  prev30dUnits: number;
  yoy30dRevenue: number;
  yoy30dUnits: number;
  forecast30dRevenue: number;
  forecast30dUnits: number;
};

export function ForecastSubKpis({
  last30dRevenue,
  last30dUnits,
  prev30dRevenue,
  prev30dUnits,
  yoy30dRevenue,
  yoy30dUnits,
  forecast30dRevenue,
  forecast30dUnits,
}: ForecastSubKpisProps) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <StatCard
        label="Mes actual"
        value={fmtMXN(last30dRevenue)}
        sub={`${fmtNumber(last30dUnits)} unidades · 30d`}
      />
      <StatCard
        label="Mes anterior"
        value={fmtMXN(prev30dRevenue)}
        sub={`${fmtNumber(prev30dUnits)} unidades · 30d`}
      />
      <StatCard
        label="Año anterior"
        value={fmtMXN(yoy30dRevenue)}
        sub={
          yoy30dRevenue > 0
            ? `${fmtNumber(yoy30dUnits)} unidades · YoY`
            : "sin histórico YoY"
        }
        muted={yoy30dRevenue === 0}
      />
      <StatCard
        label="Pronóstico"
        value={fmtMXN(forecast30dRevenue)}
        sub={`${fmtNumber(Math.round(forecast30dUnits))} unidades · próx. 30d`}
        accent
      />
    </div>
  );
}

function StatCard({
  label,
  value,
  sub,
  accent = false,
  muted = false,
}: {
  label: string;
  value: string;
  sub: string;
  accent?: boolean;
  muted?: boolean;
}) {
  return (
    <Card
      className={`p-5 gap-1 ${
        accent ? "border-foreground/30 bg-muted/30" : ""
      }`}
    >
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
        {label}
      </div>
      <div
        className={`mt-1 font-mono tabular-nums text-2xl font-semibold tracking-tight ${
          muted ? "text-muted-foreground/60" : "text-foreground"
        }`}
      >
        {value}
      </div>
      <div className="text-[11px] text-muted-foreground">{sub}</div>
    </Card>
  );
}
