"use client"

import { useState, useRef, useCallback } from "react"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

type Result = "PASS" | "FAIL" | "NA"

interface StepInfo {
  id: string
  name: string
  description: string | null
  stepOrder: number
}

interface ExistingRecord {
  stepId: string
  result: string
}

interface PhotoEntry {
  id: string
  file: File
  previewUrl: string
}

export interface InspectionFormProps {
  panelId: string
  panelIdentifier: string
  assemblyType: string | null
  steps: StepInfo[]
  existingRecords: ExistingRecord[]
  initialStepIndex: number
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function AssemblyBadge({ type }: { type: string | null }) {
  if (!type) return null
  const styles: Record<string, string> = {
    EPS: "bg-amber-50 text-amber-700",
    FRR: "bg-purple-50 text-purple-700",
  }
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        styles[type] ?? "bg-gray-100 text-gray-600"
      }`}
    >
      {type}
    </span>
  )
}

const resultConfig: Record<Result, { label: string; active: string; ring: string }> = {
  PASS: { label: "Pass", active: "bg-green-500 text-white ring-2 ring-offset-2 ring-green-400", ring: "" },
  FAIL: { label: "Fail", active: "bg-red-500 text-white ring-2 ring-offset-2 ring-red-400",   ring: "" },
  NA:   { label: "N/A",  active: "bg-gray-500 text-white ring-2 ring-offset-2 ring-gray-400",  ring: "" },
}

function stepDotStyle(
  stepId: string,
  currentStepIndex: number,
  stepIdx: number,
  completedMap: Map<string, Result>
) {
  const r = completedMap.get(stepId)
  if (r === "PASS") return "bg-green-500 text-white"
  if (r === "FAIL") return "bg-red-500 text-white"
  if (r === "NA")   return "bg-gray-400 text-white"
  if (stepIdx === currentStepIndex) return "bg-gray-900 text-white"
  return "bg-gray-100 text-gray-400"
}

function stepDotLabel(stepId: string, stepOrder: number, completedMap: Map<string, Result>) {
  const r = completedMap.get(stepId)
  if (r === "PASS") return "✓"
  if (r === "FAIL") return "✗"
  if (r === "NA")   return "–"
  return String(stepOrder)
}

// ── Completion Screen ─────────────────────────────────────────────────────────

function CompletionScreen({
  panelId,
  panelIdentifier,
  assemblyType,
  steps,
  completedMap,
}: {
  panelId: string
  panelIdentifier: string
  assemblyType: string | null
  steps: StepInfo[]
  completedMap: Map<string, Result>
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between">
        <Link
          href={`/panels/${panelId}`}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Panel {panelIdentifier}
        </Link>
        <AssemblyBadge type={assemblyType} />
      </div>

      <div className="flex-1 max-w-lg mx-auto w-full px-4 py-10">
        {/* Success icon */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2.5}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900 mb-1">Inspection Complete</h1>
          <p className="text-sm text-gray-500">
            All {steps.length} steps recorded for Panel {panelIdentifier}
          </p>
        </div>

        {/* Step summary */}
        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100 mb-6">
          {steps.map((step) => {
            const r = completedMap.get(step.id) ?? "NA"
            const badgeStyle =
              r === "PASS"
                ? "bg-green-50 text-green-700"
                : r === "FAIL"
                ? "bg-red-50 text-red-700"
                : "bg-gray-100 text-gray-500"
            const label =
              r === "PASS" ? "Pass" : r === "FAIL" ? "Fail" : "N/A"
            return (
              <div
                key={step.id}
                className="px-4 py-3 flex items-center justify-between"
              >
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 w-4 tabular-nums shrink-0">
                    {step.stepOrder}.
                  </span>
                  <span className="text-sm text-gray-900">{step.name}</span>
                </div>
                <span
                  className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium shrink-0 ${badgeStyle}`}
                >
                  {label}
                </span>
              </div>
            )
          })}
        </div>

        <Link
          href={`/panels/${panelId}`}
          className="block w-full text-center px-6 py-4 rounded-xl bg-gray-900 text-white text-base font-semibold hover:bg-gray-700 transition-colors"
        >
          Back to Panel
        </Link>
      </div>
    </div>
  )
}

// ── Main Form ─────────────────────────────────────────────────────────────────

export default function InspectionForm({
  panelId,
  panelIdentifier,
  assemblyType,
  steps,
  existingRecords,
  initialStepIndex,
}: InspectionFormProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(initialStepIndex)
  const [result, setResult] = useState<Result | null>(null)
  const [notes, setNotes] = useState("")
  const [photos, setPhotos] = useState<PhotoEntry[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [completedMap, setCompletedMap] = useState<Map<string, Result>>(
    () =>
      new Map(
        existingRecords.map((r) => [r.stepId, r.result as Result])
      )
  )

  const fileInputRef  = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const isComplete   = currentStepIndex >= steps.length
  const currentStep  = isComplete ? null : steps[currentStepIndex]
  const isLastStep   = steps.filter((s) => !completedMap.has(s.id)).length === 1

  const advanceFrom = (map: Map<string, Result>, fromIndex: number) => {
    const next = fromIndex + 1
    if (next >= steps.length) {
      const firstPending = steps.findIndex((s) => !map.has(s.id))
      setCurrentStepIndex(firstPending !== -1 ? firstPending : steps.length)
    } else {
      setCurrentStepIndex(next)
    }
  }

  const handleSkip = () => {
    setResult(null)
    setNotes("")
    setPhotos([])
    advanceFrom(completedMap, currentStepIndex)
  }

  // Validation
  const isFail    = result === "FAIL"
  const notesOk   = !isFail || notes.trim().length > 0
  const photosOk  = !isFail || photos.length > 0
  const canSubmit = result !== null && notesOk && photosOk && !isSubmitting

  const handleAddPhotos = useCallback((files: FileList | null) => {
    if (!files) return
    setError(null)
    const incoming: PhotoEntry[] = []
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setError(`"${file.name}" exceeds the 10 MB limit`)
        continue
      }
      incoming.push({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }
    setPhotos((prev) => [...prev, ...incoming])
  }, [])

  const handleRemovePhoto = useCallback((id: string) => {
    setPhotos((prev) => {
      const entry = prev.find((p) => p.id === id)
      if (entry) URL.revokeObjectURL(entry.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  const handleSubmit = async () => {
    if (!result || !currentStep) return
    setIsSubmitting(true)
    setError(null)

    try {
      // 1. Upload photos sequentially
      const photoUrls: string[] = []
      for (const photo of photos) {
        const fd = new FormData()
        fd.append("file", photo.file)
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error(data.error ?? "Photo upload failed")
        }
        const { url } = await res.json()
        photoUrls.push(url as string)
      }

      // 2. Save inspection record
      const res = await fetch("/api/inspections", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId,
          stepId:    currentStep.id,
          result,
          notes:     notes.trim() || undefined,
          photoUrls,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error ?? "Failed to save record")
      }

      // 3. Advance state
      const updatedMap = new Map(completedMap).set(currentStep.id, result)
      setCompletedMap(updatedMap)
      advanceFrom(updatedMap, currentStepIndex)
      setResult(null)
      setNotes("")
      setPhotos([])
    } catch (e) {
      setError(e instanceof Error ? e.message : "An unexpected error occurred")
    } finally {
      setIsSubmitting(false)
    }
  }

  // ── Completion screen ───────────────────────────────────────────────────────
  if (isComplete) {
    return (
      <CompletionScreen
        panelId={panelId}
        panelIdentifier={panelIdentifier}
        assemblyType={assemblyType}
        steps={steps}
        completedMap={completedMap}
      />
    )
  }

  // ── Step form ───────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">

      {/* ── Sticky header ── */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        {/* Top row: back link + step counter */}
        <div className="px-4 pt-3 pb-2 flex items-center justify-between gap-3">
          <Link
            href={`/panels/${panelId}`}
            className="text-sm text-gray-500 hover:text-gray-700 shrink-0"
          >
            ← {panelIdentifier}
          </Link>
          <div className="flex items-center gap-2 shrink-0">
            <AssemblyBadge type={assemblyType} />
            <span className="text-xs text-gray-500 tabular-nums">
              {currentStepIndex + 1} / {steps.length}
            </span>
          </div>
        </div>

        {/* Step progress dots */}
        <div className="px-4 pb-3 flex gap-1.5 overflow-x-auto">
          {steps.map((step, idx) => (
            <div
              key={step.id}
              title={step.name}
              className={`shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold select-none ${stepDotStyle(
                step.id,
                currentStepIndex,
                idx,
                completedMap
              )}`}
            >
              {stepDotLabel(step.id, step.stepOrder, completedMap)}
            </div>
          ))}
        </div>
      </div>

      {/* ── Scrollable content ── */}
      <div className="flex-1 max-w-lg mx-auto w-full px-4 pt-6 pb-10 space-y-6">

        {/* Step heading */}
        <div>
          <p className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-1">
            Step {currentStep!.stepOrder} of {steps.length}
          </p>
          <h1 className="text-xl font-bold text-gray-900">{currentStep!.name}</h1>
          {currentStep!.description && (
            <p className="text-sm text-gray-500 mt-1 leading-relaxed">
              {currentStep!.description}
            </p>
          )}
        </div>

        {/* Result buttons — stacked vertically for easy gloved use */}
        <div>
          <p className="text-sm font-medium text-gray-700 mb-3">Result</p>
          <div className="flex flex-col gap-3">
            {(["PASS", "FAIL"] as const).map((r) => {
              const cfg = resultConfig[r]
              const isSelected = result === r
              return (
                <button
                  key={r}
                  type="button"
                  onClick={() => setResult(r)}
                  className={`w-full min-h-[56px] rounded-xl text-base font-semibold transition-all active:scale-[0.99] ${
                    isSelected
                      ? cfg.active
                      : "bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300"
                  }`}
                >
                  {cfg.label}
                </button>
              )
            })}
            <button
              type="button"
              onClick={handleSkip}
              className="w-full min-h-[56px] rounded-xl text-base font-medium text-gray-400 hover:text-gray-600 transition-colors"
            >
              Skip for now
            </button>
          </div>
        </div>

        {/* Notes */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            Notes
            {isFail && (
              <span className="text-xs font-normal text-red-500">
                required for Fail
              </span>
            )}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder={
              isFail
                ? "Describe the issue (required)…"
                : "Optional notes…"
            }
            className={`w-full rounded-lg px-3 py-2.5 text-base border resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 transition-colors min-h-[80px] ${
              isFail && !notes.trim()
                ? "border-red-300 focus:ring-red-400"
                : "border-gray-200"
            }`}
          />
        </div>

        {/* Photos */}
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-1.5">
            Photos
            {isFail && (
              <span className="text-xs font-normal text-red-500">
                required for Fail
              </span>
            )}
          </label>

          {/* Hidden file inputs */}
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            multiple
            className="hidden"
            onChange={(e) => handleAddPhotos(e.target.files)}
          />
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={(e) => handleAddPhotos(e.target.files)}
          />

          {/* Thumbnails */}
          {photos.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {photos.map((photo) => (
                <div
                  key={photo.id}
                  className="relative w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={photo.previewUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                  <button
                    type="button"
                    onClick={() => handleRemovePhoto(photo.id)}
                    className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-sm leading-none hover:bg-black/80"
                    aria-label="Remove photo"
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Upload buttons */}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => cameraInputRef.current?.click()}
              className={`flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                isFail && photos.length === 0
                  ? "border-red-300 text-red-600"
                  : "border-gray-200 text-gray-700 hover:border-gray-300"
              }`}
            >
              {/* Camera icon */}
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z"
                />
              </svg>
              Take Photo
            </button>

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium hover:border-gray-300 transition-colors"
            >
              {/* Upload icon */}
              <svg
                className="w-5 h-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              Upload
            </button>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Submit button */}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={!canSubmit}
          className={`w-full py-4 rounded-xl text-base font-semibold transition-all ${
            canSubmit
              ? "bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.99]"
              : "bg-gray-100 text-gray-400 cursor-not-allowed"
          }`}
        >
          {isSubmitting ? (
            <span className="flex items-center justify-center gap-2">
              <svg
                className="w-4 h-4 animate-spin"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              Saving…
            </span>
          ) : isLastStep ? (
            "Complete Inspection"
          ) : (
            "Save & Next"
          )}
        </button>
      </div>
    </div>
  )
}
