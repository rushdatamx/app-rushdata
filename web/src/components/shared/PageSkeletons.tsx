import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";

export function HeaderSkeleton() {
  return (
    <div className="flex items-end justify-between gap-4">
      <div className="space-y-3">
        <Skeleton className="h-9 w-[280px]" />
        <Skeleton className="h-4 w-[180px]" />
      </div>
    </div>
  );
}

export function HeroSkeleton() {
  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="grid grid-cols-1 lg:grid-cols-5">
        <div className="lg:col-span-3 p-6 lg:border-r space-y-4">
          <div className="space-y-2">
            <Skeleton className="h-3 w-32" />
            <Skeleton className="h-3 w-40" />
          </div>
          <Skeleton className="h-10 w-48" />
          <Skeleton className="h-[200px] w-full" />
        </div>
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 divide-x divide-y">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex flex-col justify-center px-5 py-5 gap-2">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-7 w-32" />
              <Skeleton className="h-3 w-28" />
            </div>
          ))}
        </div>
      </div>
    </Card>
  );
}

export function FiltersSkeleton() {
  return (
    <div className="flex flex-wrap items-center gap-2 py-3">
      <Skeleton className="h-8 w-[160px]" />
      <Skeleton className="h-8 w-[180px]" />
      <Skeleton className="h-8 w-[200px]" />
      <Skeleton className="h-8 w-[240px] ml-auto" />
    </div>
  );
}

export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <Card className="p-0 gap-0 overflow-hidden">
      <div className="px-6 py-4 border-b space-y-2">
        <Skeleton className="h-5 w-48" />
        <Skeleton className="h-3 w-72" />
      </div>
      <div className="divide-y">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-6 py-3">
            <Skeleton className="h-4 w-40" />
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-4 w-12 ml-auto" />
            <Skeleton className="h-4 w-20" />
            <Skeleton className="h-4 w-24" />
          </div>
        ))}
      </div>
    </Card>
  );
}

export function GridSkeleton({ cards = 8 }: { cards?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
      {Array.from({ length: cards }).map((_, i) => (
        <Card key={i} className="p-0 gap-0 overflow-hidden">
          <div className="px-4 py-3 border-b space-y-2">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-3 w-24" />
          </div>
          <div className="px-4 py-3 grid grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, j) => (
              <div key={j} className="space-y-1">
                <Skeleton className="h-3 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            ))}
          </div>
          <div className="px-4 py-2 border-t bg-muted/20 flex items-center justify-between">
            <Skeleton className="h-5 w-16 rounded-full" />
            <Skeleton className="h-3 w-16" />
          </div>
        </Card>
      ))}
    </div>
  );
}

export function StripSkeleton() {
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Card key={i} className="p-5 gap-1">
          <Skeleton className="h-3 w-24" />
          <Skeleton className="h-7 w-28 mt-2" />
          <Skeleton className="h-3 w-32 mt-1" />
        </Card>
      ))}
    </div>
  );
}
