"use client"

import type React from "react"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Leaf, Sprout, Scan, LogOut } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

type AnalysisType = "soil" | "crop"
type CropType = "tomato" | "yam" | "potato" | "onions"
type Status = "Good" | "Bad"

type AnalysisResult = {
  status: Status
  confidence: number
  notes: string
  metrics: Record<string, string | number>
  analysisType: AnalysisType
  cropType?: CropType
  imageData?: string // Base64 encoded image data
}

export default function Page() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("soil")
  const [cropType, setCropType] = useState<CropType>("tomato")
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState("")
  const [userName, setUserName] = useState("")

  const [isDragging, setIsDragging] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)

  const pendingScanRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const router = useRouter()

  // Check authentication on mount
  useEffect(() => {
    const isAuthenticated = localStorage.getItem("isAuthenticated")
    const email = localStorage.getItem("userEmail")
    const name = localStorage.getItem("userName")

    if (!isAuthenticated || !email) {
      router.push("/login")
      return
    }

    setUserEmail(email)
    setUserName(name || email)
  }, [router])

  // Create/revoke preview URL
  useEffect(() => {
    if (file) {
      const url = URL.createObjectURL(file)
      setPreviewUrl(url)
      return () => {
        URL.revokeObjectURL(url)
      }
    } else {
      setPreviewUrl(null)
    }
  }, [file])

  // Reset when analysis type changes
  useEffect(() => {
    resetAnalysis("type-change")
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [analysisType])

  function resetAnalysis(reason?: string) {
    if (pendingScanRef.current) {
      clearInterval(pendingScanRef.current)
      pendingScanRef.current = null
    }
    setScanning(false)
    setProgress(0)
    // Keep the file if reason is not "type-change"
    if (reason !== "keep-file") {
      setFile(null)
      setPreviewUrl(null)
    }
  }

  function onDrop(e: React.DragEvent<HTMLLabelElement>) {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
    const dropped = e.dataTransfer.files?.[0]
    if (dropped && dropped.type.startsWith("image/")) {
      handleFile(dropped)
    }
  }

  function onBrowseChange(e: React.ChangeEvent<HTMLInputElement>) {
    const picked = e.target.files?.[0]
    if (picked && picked.type.startsWith("image/")) {
      handleFile(picked)
    }
    // allow re-selecting the same file
    e.currentTarget.value = ""
  }

  function handleFile(newFile: File) {
    setFile(newFile)
    startScan(newFile)
  }

  // Convert file to base64 for storage
  function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.readAsDataURL(file)
      reader.onload = () => resolve(reader.result as string)
      reader.onerror = (error) => reject(error)
    })
  }

  function startScan(sourceFile: File) {
    setScanning(true)
    setProgress(0)
    if (pendingScanRef.current) clearInterval(pendingScanRef.current)

    // Simulate scanning progress
    pendingScanRef.current = setInterval(() => {
      setProgress((prev) => {
        const delta = Math.random() * 6 + 2 // 2-8 per tick
        const next = Math.min(prev + delta, 100)
        if (next >= 100) {
          if (pendingScanRef.current) {
            clearInterval(pendingScanRef.current)
            pendingScanRef.current = null
          }
          // After a brief pause, finalize result and navigate
          setTimeout(async () => {
            const result = generateSampleResult(analysisType, cropType, sourceFile)

            // Convert image to base64 for storage
            let imageData: string | undefined
            try {
              imageData = await fileToBase64(sourceFile)
            } catch (error) {
              console.error("Failed to convert image to base64:", error)
            }

            // Store result and navigate to results page
            const resultWithImage = {
              ...result,
              analysisType,
              cropType: analysisType === "crop" ? cropType : undefined,
              imageData,
            }

            // Store in sessionStorage
            sessionStorage.setItem("analysisResult", JSON.stringify(resultWithImage))
            router.push("/results")
          }, 9000)
        }
        return next
      })
    }, 120)
  }

  function generateSampleResult(kind: AnalysisType, crop: CropType, f: File): AnalysisResult {
    // Simple deterministic seed
    const seed = (f.size % 97) + f.name.length * 7
    const rand = (min: number, max: number) => {
      const r = (Math.sin(seed + min + max) + 1) / 2
      return Number((min + r * (max - min)).toFixed(1))
    }

    const status: Status = seed % 2 === 0 ? "Good" : "Bad"
    const confidence = Math.min(99, Math.max(62, Math.round(rand(68, 95))))

    if (kind === "soil") {
      const ph = rand(5.5, 7.8)
      const moisture = rand(18, 62)
      const n = Math.round(rand(15, 80))
      const p = Math.round(rand(10, 60))
      const k = Math.round(rand(20, 90))

      const notes =
        status === "Good"
          ? "Soil quality is suitable for most crops. Minor optimization may improve yield."
          : "Soil shows suboptimal properties. Consider amending with organic matter and balanced NPK."

      return {
        status,
        confidence,
        notes,
        analysisType: kind,
        metrics: {
          pH: ph,
          "Moisture (%)": moisture,
          "Nitrogen (N)": n,
          "Phosphorus (P)": p,
          "Potassium (K)": k,
        },
      }
    } else {
      const healthIdx = rand(35, 95)
      const diseaseRisk =
        status === "Good" ? (healthIdx > 80 ? "Low" : "Moderate") : healthIdx < 55 ? "High" : "Moderate"
      const moisture = rand(30, 70)

      const cropLabel = crop.charAt(0).toUpperCase() + crop.slice(1)
      const notes =
        status === "Good"
          ? `${cropLabel} crop appears healthy. Maintain current care routine.`
          : `${cropLabel} crop shows stress indicators. Inspect leaves and adjust watering/fertilization.`

      return {
        status,
        confidence,
        notes,
        analysisType: kind,
        cropType: crop,
        metrics: {
          "Health Index": healthIdx,
          "Disease Risk": diseaseRisk,
          "Leaf/Soil Moisture (%)": moisture,
          Crop: cropLabel,
        },
      }
    }
  }

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated")
    localStorage.removeItem("userEmail")
    localStorage.removeItem("userName")
    sessionStorage.removeItem("analysisResult")
    router.push("/login")
  }

  // Don't render if not authenticated
  if (!userEmail) {
    return (
      <main className="min-h-[100dvh] bg-white flex items-center justify-center">
        <div className="text-center">
          <Scan className="h-8 w-8 text-emerald-600 animate-spin mx-auto mb-4" />
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <header className="mb-6 md:mb-8 flex items-center justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
                <Scan className="h-5 w-5 text-emerald-700" />
              </div>
              <h1 className="text-xl font-semibold tracking-tight md:text-2xl">AgriScan</h1>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Analyze soil or crop images. Choose a category, upload an image, and view a quick simulated assessment.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-right">
              <p className="text-sm font-medium">{userName}</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              <LogOut className="h-4 w-4" />
              Logout
            </Button>
          </div>
        </header>

        <div className="grid gap-6 md:grid-cols-5">
          {/* Controls */}
          <Card className="md:col-span-2">
            <CardHeader className="space-y-1">
              <CardTitle>Setup</CardTitle>
              <CardDescription>Choose what to analyze and upload an image.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid gap-2">
                <Label htmlFor="analysis-type">Analysis Type</Label>
                <Select defaultValue={analysisType} onValueChange={(v) => setAnalysisType(v as AnalysisType)}>
                  <SelectTrigger id="analysis-type" className="w-full">
                    <SelectValue placeholder="Select type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="soil">Soil</SelectItem>
                    <SelectItem value="crop">Crop</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {analysisType === "crop" && (
                <div className="grid gap-2">
                  <Label htmlFor="crop-type">Crop</Label>
                  <Select defaultValue={cropType} onValueChange={(v) => setCropType(v as CropType)}>
                    <SelectTrigger id="crop-type" className="w-full">
                      <SelectValue placeholder="Select crop" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="tomato">Tomato</SelectItem>
                      <SelectItem value="yam">Yam</SelectItem>
                      <SelectItem value="potato">Potato</SelectItem>
                      <SelectItem value="onions">Onions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-2">
                <Label>Image</Label>
                <label
                  onDragOver={(e) => {
                    e.preventDefault()
                    setIsDragging(true)
                  }}
                  onDragLeave={(e) => {
                    e.preventDefault()
                    setIsDragging(false)
                  }}
                  onDrop={onDrop}
                  className={cn(
                    "relative flex min-h-[140px] cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border border-dashed p-4 text-center transition-colors",
                    isDragging ? "border-emerald-400 bg-emerald-50/40" : "border-muted-foreground/25 hover:bg-muted/40",
                  )}
                >
                  <input
                    type="file"
                    accept="image/*"
                    onChange={onBrowseChange}
                    aria-label="Upload image for analysis"
                    className="sr-only"
                    disabled={scanning}
                  />
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-emerald-100">
                    <Upload className="h-5 w-5 text-emerald-700" aria-hidden />
                  </div>
                  <div className="space-y-1">
                    <p className="text-sm font-medium">{file ? "Replace image" : "Drag & drop or click to upload"}</p>
                    <p className="text-xs text-muted-foreground">JPG, PNG up to ~10MB</p>
                  </div>
                </label>
                {!!file && (
                  <div className="text-xs text-muted-foreground">
                    Selected: <span className="font-medium text-foreground">{file.name}</span>{" "}
                    <span>({formatBytes(file.size)})</span>
                  </div>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Button variant="outline" onClick={() => resetAnalysis()} disabled={!file && !scanning}>
                  Reset
                </Button>
                {analysisType === "soil" ? (
                  <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Leaf className="h-3.5 w-3.5" /> Soil mode
                  </div>
                ) : (
                  <div className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                    <Sprout className="h-3.5 w-3.5" /> Crop:{" "}
                    <span className="font-medium text-foreground capitalize">{cropType}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Preview + Scan */}
          <Card className="md:col-span-3">
            <CardHeader className="space-y-1">
              <CardTitle>Preview & Analysis</CardTitle>
              <CardDescription>Scanning starts automatically after upload and redirects to results.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="relative overflow-hidden rounded-lg border">
                <div className="relative aspect-video bg-muted">
                  {previewUrl ? (
                    <>
                      <img
                        src={previewUrl || "/placeholder.svg"}
                        alt="Uploaded image preview"
                        className="absolute inset-0 h-full w-full object-cover"
                      />
                      {/* Scanner overlay */}
                      {(scanning || progress > 0) && (
                        <div aria-hidden className="pointer-events-none absolute inset-0">
                          {/* Dim overlay while scanning */}
                          {scanning && <div className="absolute inset-0 bg-black/20" />}
                          {/* Moving scan line based on progress */}
                          {scanning && (
                            <div
                              className="absolute left-0 right-0 h-24 bg-gradient-to-b from-transparent via-emerald-300/70 to-transparent blur-[2px]"
                              style={{
                                top: `${Math.min(progress, 98)}%`,
                                transform: "translateY(-100%)",
                                transition: "top 120ms linear",
                              }}
                            />
                          )}
                          {/* Grid overlay for effect */}
                          <div
                            className="absolute inset-0 opacity-30"
                            style={{
                              backgroundImage:
                                "linear-gradient(transparent 23px, rgba(0,0,0,0.08) 24px), linear-gradient(90deg, transparent 23px, rgba(0,0,0,0.08) 24px)",
                              backgroundSize: "24px 24px, 24px 24px",
                            }}
                          />
                        </div>
                      )}
                    </>
                  ) : (
                    <img
                      src="/agriculture-analysis-placeholder.png"
                      alt="Placeholder"
                      className="absolute inset-0 h-full w-full object-cover"
                    />
                  )}
                </div>

                {/* Progress and status bar */}
                <div className="border-t bg-background p-3">
                  {scanning ? (
                    <div className="grid gap-2">
                      <div className="flex items-center justify-between gap-3">
                        <div className="inline-flex items-center gap-2 text-sm">
                          <Scan className="h-4 w-4 text-emerald-600" />
                          <span className="font-medium">Analyzing image...</span>
                        </div>
                        <span className="text-xs tabular-nums text-muted-foreground">{Math.round(progress)}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-emerald-500 transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Upload an image to begin analysis.</div>
                  )}
                </div>
              </div>

              {scanning && (
                <div className="text-center text-sm text-muted-foreground">
                  <p>Processing your image... You'll be redirected to the results page when complete.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </main>
  )
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}
