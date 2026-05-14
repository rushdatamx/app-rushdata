import { loadHomeData } from "@/lib/queries/home";
import { loadHomeTimeSeries } from "@/lib/queries/home-timeseries";
import { loadHomeStats } from "@/lib/queries/home-stats";
import { loadLostSaleLedger } from "@/lib/queries/lost-sale-ledger";
import { verifySession } from "@/lib/dal";
import {
  loadFiscalPeriods,
  resolvePeriod,
  buildPeriodOptions,
  loadAnchorDate,
} from "@/lib/period";
import { HomeHeader } from "@/components/home/HomeHeader";
import { HomeFilters } from "@/components/home/HomeFilters";
import { HeroChart } from "@/components/home/HeroChart";
import { SubKpiStrip } from "@/components/home/SubKpiStrip";
import { PriorityTable } from "@/components/home/PriorityTable";
import { LostSaleLedger } from "@/components/home/LostSaleLedger";

export const dynamic = "force-dynamic";

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
  const chain = sp.chain ?? "heb";
  const currency = sp.cur === "USD" ? "USD" : "MXN";

  const [fiscalPeriods, anchor] = await Promise.all([
    loadFiscalPeriods(chain),
    loadAnchorDate(),
  ]);
  const period = resolvePeriod(sp.period, fiscalPeriods, anchor);
  const periodOptions = buildPeriodOptions(fiscalPeriods, anchor);

  const [session, data, series, stats, ledger] = await Promise.all([
    verifySession(),
    loadHomeData(),
    loadHomeTimeSeries(period.start, period.end),
    loadHomeStats(),
    loadLostSaleLedger(),
  ]);

  const firstName = firstNameFromEmail(session.email);
  const { kpi, suggestedCount, suggestedValue, topSuggestions, alerts } = data;

  return (
    <div className="flex flex-col gap-6">
      <HomeHeader
        firstName={firstName}
        orgName={session.orgName}
        kpiDate={kpi.date}
        stockoutsHoy={kpi.stockouts}
        lostSaleHoy={suggestedValue}
        firstMove={topSuggestions[0] ?? null}
      />

      <HomeFilters
        chain={chain}
        currency={currency}
        periodValue={period.raw}
        periodLabel={period.label}
        periodShortLabel={period.shortLabel}
        rollingOptions={periodOptions.rolling}
        calendarOptions={periodOptions.calendar}
        fiscalOptions={periodOptions.fiscal}
      />

      <HeroChart
        series={series}
        stockouts={kpi.stockouts}
        suggestedCount={suggestedCount}
        suggestedValue={suggestedValue}
        fillRate={kpi.fillRate}
        periodLabel={period.label}
      />

      <SubKpiStrip
        storesWithStockout={stats.storesWithStockout}
        activeStores={stats.activeStores}
        productsWithStockout={stats.productsWithStockout}
        activeProducts={stats.activeProducts}
        fillRate={kpi.fillRate}
        avgDdi={stats.avgDdi}
        coverageWeeks={stats.coverageWeeks}
        activePOs={kpi.activePOs}
      />

      <PriorityTable
        rows={topSuggestions}
        totalCount={suggestedCount}
        alerts={alerts}
      />

      <LostSaleLedger
        ytdLostSale={ledger.ytdLostSale}
        ytdStockouts={ledger.ytdStockouts}
        ytdSince={ledger.ytdSince}
        monthlySeries={ledger.monthlySeries}
        lastMonthLostSale={ledger.lastMonthLostSale}
        prevMonthLostSale={ledger.prevMonthLostSale}
      />
    </div>
  );
}
