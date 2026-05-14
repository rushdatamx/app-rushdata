import {
  HeaderSkeleton,
  StripSkeleton,
  TableSkeleton,
} from "@/components/shared/PageSkeletons";

export default function Loading() {
  return (
    <div className="flex flex-col gap-6">
      <HeaderSkeleton />
      <StripSkeleton />
      <div className="h-[360px] rounded-md border bg-muted/10" />
      <TableSkeleton rows={8} />
    </div>
  );
}
