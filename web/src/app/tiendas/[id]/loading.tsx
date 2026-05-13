import { Skeleton } from "@/components/ui/skeleton";
import { HeroSkeleton, TableSkeleton } from "@/components/shared/PageSkeletons";

export default function StoreDetailLoading() {
  return (
    <div className="flex flex-col gap-6">
      <div>
        <Skeleton className="h-4 w-32" />
        <div className="mt-2 space-y-3">
          <Skeleton className="h-9 w-72" />
          <Skeleton className="h-4 w-96" />
        </div>
      </div>
      <HeroSkeleton />
      <TableSkeleton rows={5} />
      <TableSkeleton rows={8} />
    </div>
  );
}
