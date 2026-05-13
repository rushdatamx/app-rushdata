import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HeaderSkeleton,
  HeroSkeleton,
  FiltersSkeleton,
  TableSkeleton,
} from "@/components/shared/PageSkeletons";

export default function OCLoading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <HeroSkeleton />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="p-0 gap-0 overflow-hidden">
          <div className="px-6 py-4 border-b space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </Card>
        <Card className="p-0 gap-0 overflow-hidden">
          <div className="px-6 py-4 border-b space-y-2">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-3 w-32" />
          </div>
          <div className="divide-y">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3">
                <Skeleton className="h-4 w-4" />
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-4 w-12 ml-auto" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
        </Card>
      </div>
      <FiltersSkeleton />
      <TableSkeleton rows={8} />
    </div>
  );
}
