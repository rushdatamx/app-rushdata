import { loadForecast } from "@/lib/queries/forecast";
import { ForecastHero } from "@/components/forecast/ForecastHero";
import { ForecastSubKpis } from "@/components/forecast/ForecastSubKpis";
import { ForecastTable } from "@/components/forecast/ForecastTable";
import { HorizonSelector } from "@/components/forecast/HorizonSelector";
import { horizonToDays } from "@/components/forecast/horizons";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{
  horizon?: string;
}>;

export default async function ForecastPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const horizonRaw = sp.horizon ?? "90d";
  const historyDays = horizonToDays(horizonRaw);

  const data = await loadForecast({ historyDays });
  const { series, totals, topSkus, anchor } = data;

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight">
            Forecast
          </h1>
          <p className="text-sm text-muted-foreground mt-2">
            Pronóstico de venta · combina mes anterior, mismo periodo año
            anterior, y tendencia 8 semanas
          </p>
        </div>
        <HorizonSelector value={horizonRaw} />
      </div>

      {/* Hero: chart + KPIs */}
      <ForecastHero
        series={series}
        anchor={anchor}
        forecast30dRevenue={totals.forecast30dRevenue}
        forecastDeltaPct={totals.forecastDeltaPct}
        yoyDeltaPct={totals.yoyDeltaPct}
        momDeltaPct={totals.momDeltaPct}
        mape={totals.mape}
        trendSlopeWeekly={totals.trendSlopeWeekly}
      />

      {/* SubKpis: 4 ventanas comparables */}
      <ForecastSubKpis
        last30dRevenue={totals.last30dRevenue}
        last30dUnits={totals.last30dUnits}
        prev30dRevenue={totals.prev30dRevenue}
        prev30dUnits={totals.prev30dUnits}
        yoy30dRevenue={totals.yoy30dRevenue}
        yoy30dUnits={totals.yoy30dUnits}
        forecast30dRevenue={totals.forecast30dRevenue}
        forecast30dUnits={totals.forecast30dUnits}
      />

      {/* Tabla top SKUs */}
      <ForecastTable rows={topSkus} />
    </div>
  );
}
