import { Skeleton } from "@/presentation/components/ui";
import { PaddleGridSkeleton } from "@/presentation/components/paddle/paddle-card-skeleton";

export default function PaddlesLoading() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <Skeleton className="h-9 w-64" />
      <Skeleton className="mt-2 h-4 w-80" />
      <Skeleton className="mt-6 h-20 w-full rounded-2xl" />
      <PaddleGridSkeleton count={8} />
    </div>
  );
}
