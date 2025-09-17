"use client"

import { useState, useEffect } from "react"
import { X, Download, Chrome } from "lucide-react"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"

interface ExtensionWarningProps {
  className?: string
}

export function ExtensionWarning({ className }: ExtensionWarningProps) {
  const [isExtensionInstalled, setIsExtensionInstalled] = useState<boolean | null>(null)
  const [isDismissed, setIsDismissed] = useState(false)

  useEffect(() => {
    // Check if the warning was previously dismissed
    const dismissed = localStorage.getItem("leettracker-extension-warning-dismissed")
    if (dismissed === "true") {
      setIsDismissed(true)
      return
    }

    // Check if the extension is installed
    checkExtensionInstalled()
  }, [])

  const checkExtensionInstalled = () => {
    // Method 1: Check for a custom event that the extension might dispatch
    const checkForExtensionEvent = () => {
      return new Promise<boolean>((resolve) => {
        const timeout = setTimeout(() => resolve(false), 1000)

        const handleExtensionResponse = () => {
          clearTimeout(timeout)
          resolve(true)
        }

        // Listen for extension response
        window.addEventListener("leettracker-extension-installed", handleExtensionResponse, { once: true })

        // Dispatch event to check if extension is listening
        window.dispatchEvent(new CustomEvent("leettracker-check-extension"))
      })
    }

    // Method 2: Check for extension-injected elements or global variables
    const checkForExtensionElements = () => {
      // Check if extension has injected any elements or variables
      return !!(
        (window as any).leetTrackerExtension ||
        document.querySelector("[data-leettracker-extension]") ||
        document.querySelector("#leettracker-extension-marker")
      )
    }

    // Method 3: Try to access extension's content script
    const checkExtensionContentScript = async () => {
      try {
        // This would be set by the extension's content script
        return !!(window as any).leetTrackerExtensionVersion
      } catch {
        return false
      }
    }

    // Run all checks
    Promise.all([
      checkForExtensionEvent(),
      Promise.resolve(checkForExtensionElements()),
      checkExtensionContentScript(),
    ]).then(([eventCheck, elementCheck, scriptCheck]) => {
      const installed = eventCheck || elementCheck || scriptCheck
      setIsExtensionInstalled(installed)
    })
  }

  const handleDismiss = () => {
    setIsDismissed(true)
    localStorage.setItem("leettracker-extension-warning-dismissed", "true")
  }

  const handleInstallExtension = () => {
    // In a real app, this would open the Chrome Web Store
    window.open("https://chrome.google.com/webstore/detail/leettracker/your-extension-id", "_blank")
  }

  // Don't show if extension is installed, dismissed, or still checking
  if (isExtensionInstalled === null || isExtensionInstalled === true || isDismissed) {
    return null
  }

  return (
    <Alert className={`border-leetcode-orange bg-leetcode-orange/5 ${className}`}>
      <Chrome className="h-4 w-4 text-leetcode-orange" />
      <AlertDescription className="flex items-center justify-between w-full">
        <div className="flex items-center gap-2 flex-1">
          <span className="text-sm">
            <strong>LeetTracker Chrome Extension not detected.</strong> Install it to automatically sync your progress
            while solving problems on LeetCode.
          </span>
        </div>
        <div className="flex items-center gap-2 ml-4">
          <Button
            variant="outline"
            size="sm"
            onClick={handleInstallExtension}
            className="gap-1 border-leetcode-orange text-leetcode-orange hover:bg-leetcode-orange hover:text-white"
          >
            <Download className="h-3 w-3" />
            Install Extension
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="text-muted-foreground hover:text-foreground p-1"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  )
}
