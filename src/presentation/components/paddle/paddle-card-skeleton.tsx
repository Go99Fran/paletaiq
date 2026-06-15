import { Card, CardBody, Skeleton } from "@/presentation/components/ui";

/** Placeholder de carga con la misma silueta que PaddleCard. */
export function PaddleCardSkeleton() {
  return (
    <Card className="flex flex-col overflow-hidden">
      <div className="flex h-44 items-center justify-center">
        <Skeleton className="h-32 w-24" />
      </div>
      <CardBody className="space-y-2">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-1">
          <Skeleton className="h-5 w-14 rounded-md" />
          <Skeleton className="h-5 w-14 rounded-md" />
        </div>
        <Skeleton className="mt-2 h-5 w-24" />
      </CardBody>
    </Card>
  );
}

/** Grilla de skeletons para el listado. */
export function PaddleGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <PaddleCardSkeleton key={i} />
      ))}
    </div>
  );
}
