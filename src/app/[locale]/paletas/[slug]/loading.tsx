import { Card, CardBody, Skeleton } from "@/presentation/components/ui";

export default function PaddleDetailLoading() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-10">
      <Skeleton className="h-4 w-24" />
      <div className="mt-6 grid gap-8 lg:grid-cols-[2fr_3fr]">
        <Card className="flex h-fit items-center justify-center p-6">
          <Skeleton className="h-80 w-full" />
        </Card>
        <div className="space-y-4">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-9 w-3/4" />
          <div className="flex gap-2">
            <Skeleton className="h-6 w-20 rounded-md" />
            <Skeleton className="h-6 w-20 rounded-md" />
          </div>
          <Card>
            <CardBody className="space-y-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="flex justify-between">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-32" />
                </div>
              ))}
            </CardBody>
          </Card>
        </div>
      </div>
    </div>
  );
}
