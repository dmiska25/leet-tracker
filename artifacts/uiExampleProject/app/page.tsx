"use client"

import { useState, useEffect } from "react"
import { Suspense } from "react"
import Dashboard from "@/components/dashboard"
import { DashboardSkeleton } from "@/components/dashboard-skeleton"
import { OnboardingFlow } from "@/components/onboarding/onboarding-flow"

export default function HomePage() {
  const [showOnboarding, setShowOnboarding] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Check if user has completed onboarding
    const hasCompletedOnboarding = localStorage.getItem("leettracker-onboarding-complete")
    if (hasCompletedOnboarding === "true") {
      setShowOnboarding(false)
    }
  }, [])

  const handleOnboardingComplete = () => {
    localStorage.setItem("leettracker-onboarding-complete", "true")
    setShowOnboarding(false)
  }

  if (!mounted) {
    return null
  }

  if (showOnboarding) {
    return <OnboardingFlow onComplete={handleOnboardingComplete} />
  }

  return (
    <div className="min-h-screen bg-background">
      <Suspense fallback={<DashboardSkeleton />}>
        <Dashboard />
      </Suspense>
    </div>
  )
}
