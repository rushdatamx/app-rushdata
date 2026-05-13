import {
  HeaderSkeleton,
  HeroSkeleton,
  FiltersSkeleton,
  GridSkeleton,
} from "@/components/shared/PageSkeletons";

export default function TiendasLoading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <HeroSkeleton />
      <FiltersSkeleton />
      <GridSkeleton cards={8} />
    </div>
  );
}
