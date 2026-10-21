import { Skeleton, TableSkeleton } from "@/components/ui/States";

/** Same footprint as FilterBar + DataTable, so nothing jumps when data arrives. */
export function PlayerTableSkeleton({ label, search = true }: { label: string; search?: boolean }) {
  return (
    <div className="flex flex-col gap-4" aria-busy="true">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <Skeleton className="h-9 w-44 rounded-md" />
        {search && <Skeleton className="h-9 w-full rounded-md sm:w-72" />}
        <Skeleton className="h-4 w-20 sm:ml-auto" />
      </div>
      <TableSkeleton rows={10} label={label} />
    </div>
  );
}
