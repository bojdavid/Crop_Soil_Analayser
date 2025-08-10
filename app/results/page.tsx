"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, CheckCircle2, AlertTriangle, Scan, LogOut } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { cn } from "@/lib/utils"

type AnalysisResult = {
  status: "Good" | "Bad"
  confidence: number
  notes: string
  metrics: Record<string, string | number>
  analysisType: "soil" | "crop"
  cropType?: string
  imageUrl?: string
}

export default function ResultsPage() {
  const [result, setResult] = useState<AnalysisResult | null>(null)
  const [userEmail, setUserEmail] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const router = useRouter()

  useEffect(() => {
    // Check authentication
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    const email = localStorage.getItem("userEmail")

    if (!isAuthenticated || !email) {
      router.push("/login")
      return
    }

    setUserEmail(email)

    // Get result from sessionStorage
    try {
      const storedResult = sessionStorage.getItem("analysisResult")
      if (storedResult) {
        const parsedResult = JSON.parse(storedResult)
        setResult(parsedResult)
      } else {
        // No result found, redirect to home
        router.push("/")
        return
      }
    } catch (error) {
      console.error("Failed to parse result data:", error)
      router.push("/")
      return
    }

    setIsLoading(false)
  }, [router])

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("userEmail")
    sessionStorage.removeItem("analysisResult")
    router.push("/login")
  }

  const handleBackToAnalysis = () => {
    sessionStorage.removeItem("analysisResult")
    router.push("/")
  }

  if (isLoading) {
    return (
      <main className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <Scan className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading results...</p>
        </div>
      </main>
    )
  }

  if (!result) {
    return (
      <main className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <AlertTriangle className="h-8 w-8 text-red-600 mx-auto mb-4" />
          <p className="text-muted-foreground mb-4">No analysis results found.</p>
          <Button onClick={() => router.push("/")}>Return to Analysis</Button>
        </div>
      </main>
    )
  }

  const statusColor =
    result.status === "Good"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : "text-red-700 bg-red-50 border-red-200"

  const statusIcon =
    result.status === "Good" ? (
      <CheckCircle2 className="h-5 w-5 text-emerald-600" />
    ) : (
      <AlertTriangle className="h-5 w-5 text-red-600" />
    )

  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="mx-auto w-full max-w-4xl px-4 py-8">
        {/* Header */}
        <header className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button variant="outline" size="sm" onClick={handleBackToAnalysis}>
              <ArrowLeft className="h-4 w-4" />
              Back to Analysis
            </Button>
            <div className="flex items-center gap-2">
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-100">
                <Scan className="h-4 w-4 text-emerald-700" />
              </div>
              <h1 className="text-xl font-semibold">Analysis Results</h1>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">{userEmail}</span>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Image Preview */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Analyzed Image</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="aspect-square rounded-lg border overflow-hidden bg-muted">
                {result.imageUrl ? (
                  <img
                    src={result.imageUrl || "/placeholder.svg"}
                    alt="Analyzed image"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-muted-foreground">
                    <Scan className="h-12 w-12" />
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Results */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-lg">
                    {result.analysisType === "soil"
                      ? "Soil Analysis"
                      : `${result.cropType?.charAt(0).toUpperCase()}${result.cropType?.slice(1)} Crop Analysis`}
                  </CardTitle>
                  <CardDescription>Analysis completed with {result.confidence}% confidence</CardDescription>
                </div>
                <div className={cn("flex items-center gap-2 rounded-md border px-3 py-2", statusColor)}>
                  {statusIcon}
                  <span className="font-medium">{result.status}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Metrics Grid */}
              <div>
                <h3 className="font-medium mb-3">Detailed Metrics</h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {Object.entries(result.metrics).map(([key, value]) => (
                    <div key={key} className="flex flex-col gap-1 rounded-lg bg-muted/60 p-3">
                      <span className="text-xs text-muted-foreground">{key}</span>
                      <span className="font-medium">{typeof value === "number" ? formatNumber(value) : value}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Analysis Notes */}
              <div>
                <h3 className="font-medium mb-2">Analysis Notes</h3>
                <div className="rounded-lg bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">{result.notes}</p>
                </div>
              </div>

              {/* Recommendations */}
              <div>
                <h3 className="font-medium mb-2">Recommendations</h3>
                <div className="space-y-2">
                  {result.status === "Good" ? (
                    <div className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                      <span>Continue with current care practices. Monitor regularly for optimal results.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <div className="flex items-start gap-2 text-sm">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <span>Immediate attention required. Consider consulting with an agricultural expert.</span>
                      </div>
                      {result.analysisType === "soil" && (
                        <div className="flex items-start gap-2 text-sm">
                          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                          <span>Consider soil amendments and proper fertilization based on NPK levels.</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <Button onClick={handleBackToAnalysis} className="flex-1">
                  Analyze Another Sample
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                  Print Results
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Disclaimer */}
        <div className="mt-8 text-center">
          <p className="text-xs text-muted-foreground">
            This is a simulated demo. For production use, integrate with real AI models and agricultural databases.
          </p>
        </div>
      </div>
    </main>
  )
}

function formatNumber(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1)
}
