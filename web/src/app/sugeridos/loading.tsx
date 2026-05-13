import {
  HeaderSkeleton,
  HeroSkeleton,
  FiltersSkeleton,
  TableSkeleton,
} from "@/components/shared/PageSkeletons";

export default function SugeridosLoading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <HeroSkeleton />
      <FiltersSkeleton />
      <TableSkeleton rows={8} />
    </div>
  );
}
