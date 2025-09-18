import { Suspense } from "react"
import Dashboard from "@/components/dashboard"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  )
}
