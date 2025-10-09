"use client"

import { useState, useEffect } from "react"
import { Chrome, Download, Loader2, ArrowRight } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface ExtensionInstallProps {
  onContinue: (skipped: boolean) => void
}

export function ExtensionInstall({ onContinue }: ExtensionInstallProps) {
  const [isChecking, setIsChecking] = useState(true)
  const [isExtensionInstalled, setIsExtensionInstalled] = useState(false)

  useEffect(() => {
    // Simulate checking for extension
    const checkExtension = () => {
      // Check for extension presence
      const checkForExtensionEvent = () => {
        return new Promise<boolean>((resolve) => {
          const timeout = setTimeout(() => resolve(false), 2000)

          const handleExtensionResponse = () => {
            clearTimeout(timeout)
            resolve(true)
          }

          window.addEventListener("leettracker-extension-installed", handleExtensionResponse, { once: true })
          window.dispatchEvent(new CustomEvent("leettracker-check-extension"))
        })
      }

      const checkForExtensionElements = () => {
        return !!(
          (window as any).leetTrackerExtension ||
          document.querySelector("[data-leettracker-extension]") ||
          document.querySelector("#leettracker-extension-marker")
        )
      }

      Promise.all([checkForExtensionEvent(), Promise.resolve(checkForExtensionElements())]).then(
        ([eventCheck, elementCheck]) => {
          const installed = eventCheck || elementCheck
          setIsExtensionInstalled(installed)
          setIsChecking(false)

          if (installed) {
            // Auto-continue after a brief delay if extension is detected
            setTimeout(() => {
              onContinue(false)
            }, 1500)
          }
        },
      )
    }

    checkExtension()

    // Check periodically for extension installation
    const interval = setInterval(checkExtension, 3000)
    return () => clearInterval(interval)
  }, [onContinue])

  const handleInstallExtension = () => {
    window.open("https://chrome.google.com/webstore/detail/leettracker/your-extension-id", "_blank")
  }

  const handleTryDemo = () => {
    onContinue(true) // Pass true to indicate user skipped extension
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* DEV CONTINUE Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={() => onContinue(false)}
        className="fixed top-4 right-4 z-50 border-dashed border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white bg-transparent"
      >
        DEV CONTINUE →
      </Button>

      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Chrome className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Welcome to LeetTracker!</CardTitle>
          <CardDescription className="text-base mt-2">
            Get the most out of your LeetCode practice with our Chrome extension
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Checking Status */}
          {isChecking && (
            <Alert className="border-blue-500 bg-blue-500/5">
              <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
              <AlertDescription className="ml-2">Checking for extension installation...</AlertDescription>
            </Alert>
          )}

          {/* Extension Detected */}
          {!isChecking && isExtensionInstalled && (
            <Alert className="border-green-500 bg-green-500/5">
              <Chrome className="h-4 w-4 text-green-500" />
              <AlertDescription className="ml-2">
                <strong>Extension detected!</strong> Proceeding to next step...
              </AlertDescription>
            </Alert>
          )}

          {/* Extension Not Detected */}
          {!isChecking && !isExtensionInstalled && (
            <Alert className="border-orange-500 bg-orange-500/5">
              <Chrome className="h-4 w-4 text-orange-500" />
              <AlertDescription className="ml-2">
                <strong>Extension not detected.</strong> Install it to unlock all features.
              </AlertDescription>
            </Alert>
          )}

          {/* Features List */}
          <div className="space-y-4">
            <h3 className="font-semibold text-lg">Why install the extension?</h3>
            <div className="grid gap-3">
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium">Automatic Progress Tracking</p>
                  <p className="text-sm text-muted-foreground">
                    Your solved problems are automatically synced as you practice
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium">Code Evolution Snapshots</p>
                  <p className="text-sm text-muted-foreground">
                    Watch how your solution evolved with automatic code snapshots
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium">Smart Recommendations</p>
                  <p className="text-sm text-muted-foreground">
                    Get personalized problem recommendations based on your progress
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <span className="text-primary text-sm">✓</span>
                </div>
                <div>
                  <p className="font-medium">Performance Analytics</p>
                  <p className="text-sm text-muted-foreground">Track your solve times and improvement over time</p>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-3 pt-4">
            <Button onClick={handleInstallExtension} className="flex-1 gap-2" size="lg">
              <Download className="h-5 w-5" />
              Install Chrome Extension
            </Button>
            <Button onClick={handleTryDemo} variant="outline" className="flex-1 gap-2 bg-transparent" size="lg">
              <ArrowRight className="h-5 w-5" />
              Try Demo Without Extension
            </Button>
          </div>

          <p className="text-center text-sm text-muted-foreground">
            Without the extension, many features will be limited or unavailable.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
