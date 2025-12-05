"use client"

import { useState, useEffect } from "react"
import { Loader2, ExternalLink, CheckCircle2, Database } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Progress } from "@/components/ui/progress"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface DataSyncProps {
  onComplete: () => void
}

export function DataSync({ onComplete }: DataSyncProps) {
  const [syncStatus, setSyncStatus] = useState<"waiting" | "syncing" | "complete">("waiting")
  const [syncProgress, setSyncProgress] = useState(0)

  useEffect(() => {
    // Simulate detecting sync start
    const detectSyncStart = setTimeout(() => {
      setSyncStatus("syncing")
    }, 3000)

    return () => clearTimeout(detectSyncStart)
  }, [])

  useEffect(() => {
    if (syncStatus === "syncing") {
      // Simulate progress
      const interval = setInterval(() => {
        setSyncProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval)
            setSyncStatus("complete")
            setTimeout(() => {
              onComplete()
            }, 1500)
            return 100
          }
          return prev + 5
        })
      }, 200)

      return () => clearInterval(interval)
    }
  }, [syncStatus, onComplete])

  const handleGoToLeetCode = () => {
    window.open("https://leetcode.com/problemset/", "_blank")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      {/* DEV CONTINUE Button */}
      <Button
        variant="outline"
        size="sm"
        onClick={onComplete}
        className="fixed top-4 right-4 z-50 border-dashed border-2 border-yellow-500 text-yellow-600 hover:bg-yellow-500 hover:text-white bg-transparent"
      >
        DEV CONTINUE →
      </Button>

      <Card className="max-w-2xl w-full">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Database className="h-12 w-12 text-primary" />
            </div>
          </div>
          <CardTitle className="text-3xl">Sync Your LeetCode Data</CardTitle>
          <CardDescription className="text-base mt-2">
            We need to sync your LeetCode progress to provide personalized recommendations
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Waiting for Sync */}
          {syncStatus === "waiting" && (
            <>
              <Alert className="border-blue-500 bg-blue-500/5">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <AlertDescription className="ml-2">
                  Waiting for sync to begin... Visit LeetCode to start syncing your data.
                </AlertDescription>
              </Alert>

              <div className="space-y-4">
                <h3 className="font-semibold text-lg">How to sync your data:</h3>
                <ol className="space-y-3 list-decimal list-inside">
                  <li className="text-sm">
                    Click the button below to visit LeetCode
                    <p className="text-muted-foreground ml-6 mt-1">
                      The extension will automatically detect your visit
                    </p>
                  </li>
                  <li className="text-sm">
                    Browse your problem list or solve a problem
                    <p className="text-muted-foreground ml-6 mt-1">This allows the extension to capture your data</p>
                  </li>
                  <li className="text-sm">
                    Return to this tab
                    <p className="text-muted-foreground ml-6 mt-1">We'll automatically detect when syncing starts</p>
                  </li>
                </ol>
              </div>

              <Button onClick={handleGoToLeetCode} className="w-full gap-2" size="lg">
                <ExternalLink className="h-5 w-5" />
                Go to LeetCode
              </Button>
            </>
          )}

          {/* Syncing in Progress */}
          {syncStatus === "syncing" && (
            <>
              <Alert className="border-blue-500 bg-blue-500/5">
                <Loader2 className="h-4 w-4 animate-spin text-blue-500" />
                <AlertDescription className="ml-2">
                  <strong>Syncing your data...</strong> This may take a few moments.
                </AlertDescription>
              </Alert>

              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="font-medium">Sync Progress</span>
                  <span className="text-muted-foreground">{syncProgress}%</span>
                </div>
                <Progress value={syncProgress} className="h-2" />
              </div>

              <div className="space-y-2 text-sm text-muted-foreground">
                <p>⏳ Fetching your solved problems...</p>
                <p>⏳ Analyzing problem categories...</p>
                <p>⏳ Calculating your progress...</p>
              </div>
            </>
          )}

          {/* Sync Complete */}
          {syncStatus === "complete" && (
            <>
              <Alert className="border-green-500 bg-green-500/5">
                <CheckCircle2 className="h-4 w-4 text-green-500" />
                <AlertDescription className="ml-2">
                  <strong>Sync complete!</strong> Your data has been successfully imported.
                </AlertDescription>
              </Alert>

              <div className="text-center py-4">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-500/10 mb-4">
                  <CheckCircle2 className="h-8 w-8 text-green-500" />
                </div>
                <p className="text-muted-foreground">Redirecting to your dashboard...</p>
              </div>
            </>
          )}

          <p className="text-center text-sm text-muted-foreground">
            Your data is synced locally and never leaves your browser without your permission.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
