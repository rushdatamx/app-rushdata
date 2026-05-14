import { loadHomeBusinessData } from "@/lib/queries/home-business";
import { verifySession } from "@/lib/dal";
import { loadAnchorDate } from "@/lib/period";
import { BusinessHeader } from "@/components/home-business/BusinessHeader";
import { YoyHeroCard } from "@/components/home-business/YoyHeroCard";
import { TopProductsCard } from "@/components/home-business/TopProductsCard";
import { TopStoresCard } from "@/components/home-business/TopStoresCard";

export const dynamic = "force-dynamic";

function firstNameFromEmail(email: string): string {
  if (!email) return "—";
  const local = email.split("@")[0] ?? "";
  const first = local.split(/[.\-_]/)[0] ?? local;
  if (!first) return "—";
  return first.charAt(0).toUpperCase() + first.slice(1);
}

export default async function Home() {
  const [session, anchor, biz] = await Promise.all([
    verifySession(),
    loadAnchorDate(),
    loadHomeBusinessData(),
  ]);

  const firstName = firstNameFromEmail(session.email);

  return (
    <div className="flex flex-col gap-6">
      <BusinessHeader
        firstName={firstName}
        orgName={session.orgName}
        anchorDate={anchor}
      />

      <YoyHeroCard
        monthly={biz.monthly}
        totalCurrent={biz.totalCurrent}
        totalPrevious={biz.totalPrevious}
        totalDeltaPct={biz.totalDeltaPct}
      />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <TopProductsCard rows={biz.topProducts} />
        <TopStoresCard rows={biz.topStores} />
      </div>
    </div>
  );
}
