import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Skeleton } from "@/components/ui/skeleton"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"

export function DashboardSkeleton() {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-8">
      {/* Navigation Skeleton */}
      <div className="border-b">
        <div className="flex h-16 items-center px-0">
          <div className="flex items-center gap-4">
            <Skeleton className="h-6 w-24" />
          </div>
          <div className="ml-auto flex items-center gap-4">
            <Tabs defaultValue="dashboard" className="mr-4">
              <TabsList>
                <TabsTrigger value="dashboard" disabled>
                  Dashboard
                </TabsTrigger>
                <TabsTrigger value="history" disabled>
                  Solve History
                </TabsTrigger>
              </TabsList>
            </Tabs>
            <Skeleton className="h-10 w-10 rounded-full" />
          </div>
        </div>
      </div>

      {/* Header Skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Skeleton className="h-9 w-64 mb-2" />
          <Skeleton className="h-5 w-40" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-32" />
        </div>
      </div>

      {/* Recommendations Skeleton */}
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {Array(6)
              .fill(0)
              .map((_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-16 w-full" />
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
