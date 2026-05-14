import {
  HeaderSkeleton,
  HeroSkeleton,
  StripSkeleton,
  TableSkeleton,
} from "@/components/shared/PageSkeletons";

export default function ForecastLoading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <HeroSkeleton />
      <StripSkeleton />
      <TableSkeleton rows={10} />
    </div>
  );
}
