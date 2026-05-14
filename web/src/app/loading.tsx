import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  HeroSkeleton,
  StripSkeleton,
  TableSkeleton,
} from "@/components/shared/PageSkeletons";

function HomeHeaderSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end justify-between gap-4">
        <div className="space-y-3">
          <Skeleton className="h-9 w-[280px]" />
          <Skeleton className="h-4 w-[180px]" />
        </div>
        <Skeleton className="h-8 w-[160px] hidden sm:block" />
      </div>
      <Card className="p-0 overflow-hidden">
        <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-start gap-3 px-5 py-4">
              <Skeleton className="size-8 rounded-md shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-28" />
                <Skeleton className="h-6 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function LedgerSkeleton() {
  return (
    <Card className="p-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-2 p-6 lg:border-r space-y-4">
          <Skeleton className="h-3 w-32" />
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-3 w-full" />
          <div className="grid grid-cols-2 gap-4 pt-4 border-t">
            <Skeleton className="h-10 w-full" />
            <Skeleton className="h-10 w-full" />
          </div>
        </div>
        <div className="lg:col-span-3 p-6 space-y-3">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-[140px] w-full" />
        </div>
      </div>
    </Card>
  );
}

export default function HomeLoading() {
  return (
    <div className="flex flex-col gap-6">
      <HomeHeaderSkeleton />
      <HeroSkeleton />
      <StripSkeleton />
      <TableSkeleton rows={5} />
      <LedgerSkeleton />
    </div>
  );
}
