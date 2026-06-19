import { Skeleton } from "@/presentation/components/ui";

export default function FinderLoading() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10">
      <div className="flex flex-col items-center">
        <Skeleton className="h-9 w-72" />
        <Skeleton className="mt-2 h-4 w-80" />
      </div>
      <div className="mt-8 space-y-4">
        <Skeleton className="h-20 w-3/4 rounded-2xl" />
        <Skeleton className="ml-auto h-12 w-2/3 rounded-2xl" />
        <Skeleton className="h-24 w-full rounded-2xl" />
      </div>
    </div>
  );
}
