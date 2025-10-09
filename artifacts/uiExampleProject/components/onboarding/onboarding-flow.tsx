"use client"

import { useState } from "react"
import { ExtensionInstall } from "./extension-install"
import { DataSync } from "./data-sync"

interface OnboardingFlowProps {
  onComplete: () => void
}

export function OnboardingFlow({ onComplete }: OnboardingFlowProps) {
  const [currentStep, setCurrentStep] = useState<"extension" | "sync">("extension")
  const [skippedExtension, setSkippedExtension] = useState(false)

  const handleExtensionContinue = (skipped: boolean) => {
    setSkippedExtension(skipped)

    if (skipped) {
      // If user skipped extension install, go straight to dashboard
      onComplete()
    } else {
      // If user installed extension, proceed to sync
      setCurrentStep("sync")
    }
  }

  const handleSyncComplete = () => {
    onComplete()
  }

  if (currentStep === "extension") {
    return <ExtensionInstall onContinue={handleExtensionContinue} />
  }

  if (currentStep === "sync" && !skippedExtension) {
    return <DataSync onComplete={handleSyncComplete} />
  }

  return null
}
