"use client"

import type React from "react"

import { useEffect, useMemo, useRef, useState } from "react"
import { Upload, Leaf, Sprout, CheckCircle2, AlertTriangle, Scan } from "lucide-react"
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
}

export default function Page() {
  const [analysisType, setAnalysisType] = useState<AnalysisType>("soil")
  const [cropType, setCropType] = useState<CropType>("tomato")
  const [file, setFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const [isDragging, setIsDragging] = useState(false)
  const [scanning, setScanning] = useState(false)
  const [progress, setProgress] = useState(0)
  const [result, setResult] = useState<AnalysisResult | null>(null)

  const pendingScanRef = useRef<ReturnType<typeof setInterval> | null>(null)

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
    setResult(null)
    // Keep the file if reason is not "type-change"? For clarity, clear it unless user specifically wants to keep.
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
    setResult(null)
    // If crop type is required, we already have a default "tomato", so continue.
    startScan(newFile)
  }

  function startScan(sourceFile: File) {
    setScanning(true)
    setProgress(0)
    setResult(null)
    if (pendingScanRef.current) clearInterval(pendingScanRef.current)

    // Simulate scanning progress
    const start = Date.now()
    pendingScanRef.current = setInterval(() => {
      setProgress((prev) => {
        // Smooth-ish progress until 100%
        const delta = Math.random() * 6 + 2 // 2-8 per tick
        const next = Math.min(prev + delta, 100)
        if (next >= 100) {
          if (pendingScanRef.current) {
            clearInterval(pendingScanRef.current)
            pendingScanRef.current = null
          }
          // After a brief pause, finalize result
          setTimeout(() => {
            const r = generateSampleResult(analysisType, cropType, sourceFile)
            setResult(r)
            setScanning(false)
          }, 400)
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
        metrics: {
          "Health Index": healthIdx,
          "Disease Risk": diseaseRisk,
          "Leaf/Soil Moisture (%)": moisture,
          Crop: cropLabel,
        },
      }
    }
  }

  const statusColor = useMemo(
    () =>
      result?.status === "Good"
        ? "text-emerald-700 bg-emerald-50 border-emerald-200"
        : "text-red-700 bg-red-50 border-red-200",
    [result?.status],
  )
  const statusIcon =
    result?.status === "Good" ? (
      <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-hidden />
    ) : (
      <AlertTriangle className="h-4 w-4 text-red-600" aria-hidden />
    )

  return (
    <main className="min-h-[100dvh] bg-white">
      <div className="mx-auto w-full max-w-6xl px-4 py-8 md:py-10">
        <header className="mb-6 md:mb-8">
          <div className="flex items-center gap-2">
            <div className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-100">
              <Scan className="h-5 w-5 text-emerald-700" />
            </div>
            <h1 className="text-xl font-semibold tracking-tight md:text-2xl">AgriScan</h1>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Analyze soil or crop images. Choose a category, upload an image, and view a quick simulated assessment.
          </p>
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
                <Button variant="outline" onClick={() => resetAnalysis()} disabled={!file && !result && !scanning}>
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

          {/* Preview + Scan + Result */}
          <Card className="md:col-span-3">
            <CardHeader className="space-y-1">
              <CardTitle>Preview & Analysis</CardTitle>
              <CardDescription>Scanning starts automatically after upload.</CardDescription>
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
                          <span className="font-medium">Scanning...</span>
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
                  ) : result ? (
                    <div
                      className={cn("flex items-center justify-between gap-3 rounded-md border px-3 py-2", statusColor)}
                    >
                      <div className="inline-flex items-center gap-2">
                        {statusIcon}
                        <span className="text-sm font-medium">
                          {analysisType === "soil"
                            ? `Soil status: ${result.status}`
                            : `${capitalize(cropType)} crop status: ${result.status}`}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">Confidence: {result.confidence}%</span>
                    </div>
                  ) : (
                    <div className="text-sm text-muted-foreground">Upload an image to begin scanning.</div>
                  )}
                </div>
              </div>

              {/* Sample data */}
              {result && (
                <div className="grid gap-3">
                  <div className="text-sm font-medium">Sample data</div>
                  <div className="grid gap-2 rounded-lg border p-4">
                    <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-3 lg:grid-cols-4">
                      {Object.entries(result.metrics).map(([k, v]) => (
                        <div
                          key={k}
                          className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2"
                        >
                          <span className="text-muted-foreground">{k}</span>
                          <span className="font-medium text-foreground">
                            {typeof v === "number" ? formatNumber(v) : v}
                          </span>
                        </div>
                      ))}
                      <div className="flex items-center justify-between gap-2 rounded-md bg-muted/60 px-3 py-2">
                        <span className="text-muted-foreground">Status</span>
                        <span
                          className={cn(
                            "inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs font-semibold",
                            result.status === "Good" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700",
                          )}
                        >
                          {result.status === "Good" ? (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5" />
                          )}
                          {result.status}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm text-muted-foreground">{result.notes}</p>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    This is a simulated demo. Integrate a real model or rules engine to power production analysis.
                  </p>
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

function formatNumber(n: number): string {
  return Number.isInteger(n) ? `${n}` : n.toFixed(1)
}

function capitalize<T extends string>(s: T): T {
  return (s.charAt(0).toUpperCase() + s.slice(1)) as T
}
