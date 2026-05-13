import { loadHomeData } from "@/lib/queries/home";
import { loadHomeTimeSeries } from "@/lib/queries/home-timeseries";
import { loadHomeStats } from "@/lib/queries/home-stats";
import { verifySession } from "@/lib/dal";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeFilters } from "@/components/home/HomeFilters";
import { HeroChart } from "@/components/home/HeroChart";
import { SubKpiStrip } from "@/components/home/SubKpiStrip";
import { PriorityTable } from "@/components/home/PriorityTable";
import { UnresolvedAlertsTable } from "@/components/home/UnresolvedAlertsTable";

export const dynamic = "force-dynamic";

const PERIOD_DAYS: Record<string, number> = { "7d": 7, "30d": 30, "90d": 90 };
const PERIOD_LABEL: Record<string, string> = {
  "7d": "Últimos 7 días",
  "30d": "Últimos 30 días",
  "90d": "Últimos 90 días",
};

type SearchParams = Promise<{
  period?: string;
  chain?: string;
  cur?: string;
}>;

function firstNameFromEmail(email: string): string {
  if (!email) return "—";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[.\-_]/)[0] ?? local;
  if (!first) return "—";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export default async function Home({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const sp = await searchParams;
  const period = sp.period && PERIOD_DAYS[sp.period] ? sp.period : "30d";
  const chain = sp.chain ?? "heb";
  const currency = sp.cur === "USD" ? "USD" : "MXN";
  const days = PERIOD_DAYS[period];

  const [session, data, series, stats] = await Promise.all([
    verifySession(),
    loadHomeData(),
    loadHomeTimeSeries(days),
    loadHomeStats(),
  ]);

  const firstName = firstNameFromEmail(session.email);
  const { kpi, suggestedCount, suggestedValue, topSuggestions, alerts } = data;

  return (
    <div className="flex flex-col gap-6">
      <HomeHeader
        firstName={firstName}
        orgName={session.orgName}
        kpiDate={kpi.date}
      />

      <HomeFilters chain={chain} period={period} currency={currency} />

      <HeroChart
        series={series}
        stockouts={kpi.stockouts}
        suggestedCount={suggestedCount}
        suggestedValue={suggestedValue}
        fillRate={kpi.fillRate}
        periodLabel={PERIOD_LABEL[period]}
      />

      <SubKpiStrip
        avgDdi={stats.avgDdi}
        activeStores={stats.activeStores}
        activeProducts={stats.activeProducts}
        activePOs={kpi.activePOs}
        inventoryValue={kpi.inventoryValue}
      />

      <PriorityTable rows={topSuggestions} totalCount={suggestedCount} />

      <UnresolvedAlertsTable rows={alerts} />
    </div>
  );
}
