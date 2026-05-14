import {
  HeaderSkeleton,
  StripSkeleton,
  FiltersSkeleton,
  TableSkeleton,
} from "@/components/shared/PageSkeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <StripSkeleton />
      <FiltersSkeleton />
      <TableSkeleton rows={10} />
    </div>
  );
}
