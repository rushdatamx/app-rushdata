import {
  HeaderSkeleton,
  FiltersSkeleton,
  TableSkeleton,
} from "@/components/shared/PageSkeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <FiltersSkeleton />
      <FiltersSkeleton />
      <TableSkeleton rows={12} />
    </div>
  );
}
