"use client"

import { useState, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"

// ── Types ─────────────────────────────────────────────────────────────────────

type Result = "PASS" | "FAIL" | "NA"

export interface StepInfo {
  id: string
  name: string
  description: string | null
  stepOrder: number
}

export interface ExistingPhoto {
  id: string
  url: string
}

export interface RecordData {
  id: string
  stepId: string
  result: Result
  notes: string | null
  completedAt: string   // ISO string — serialized from server
  inspectorName: string
  photos: ExistingPhoto[]
}

interface PhotoEntry {
  id: string
  file: File
  previewUrl: string
}

export interface ChecklistSectionProps {
  panelId: string
  steps: StepInfo[]
  records: RecordData[]
  role: string
  recordCount: number
  totalSteps: number
  hideCta?: boolean
}

// ── Style maps ────────────────────────────────────────────────────────────────

const RESULT_BADGE: Record<Result, string> = {
  PASS: "bg-green-50 text-green-700",
  FAIL: "bg-red-50 text-red-700",
  NA:   "bg-gray-100 text-gray-500",
}

const RESULT_LABEL: Record<Result, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  NA:   "N/A",
}

const RESULT_ACTIVE: Record<Result, string> = {
  PASS: "bg-green-500 text-white ring-2 ring-offset-2 ring-green-400",
  FAIL: "bg-red-500 text-white ring-2 ring-offset-2 ring-red-400",
  NA:   "bg-gray-500 text-white ring-2 ring-offset-2 ring-gray-400",
}

// ── Small helpers ─────────────────────────────────────────────────────────────

function ResultBadge({ result }: { result: Result }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${RESULT_BADGE[result]}`}
    >
      {RESULT_LABEL[result]}
    </span>
  )
}

function formatDate(iso: string): string {
  return new Intl.DateTimeFormat("en-US", {
    month:  "short",
    day:    "numeric",
    year:   "numeric",
    hour:   "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso))
}

function PencilIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      viewBox="0 0 24 24"
      stroke="currentColor"
      strokeWidth={2}
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L10.582 16.07a4.5 4.5 0 01-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 011.13-1.897l8.932-8.931zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0115.75 21H5.25A2.25 2.25 0 013 18.75V8.25A2.25 2.25 0 015.25 6H10"
      />
    </svg>
  )
}

function SpinnerIcon() {
  return (
    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
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
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ChecklistSection({
  panelId,
  steps,
  records,
  role,
  recordCount,
  totalSteps,
  hideCta = false,
}: ChecklistSectionProps) {
  const router     = useRouter()
  const isInspector = role === "QC_INSPECTOR"

  // ── Edit modal state ────────────────────────────────────────────────────────
  const [editingRecord, setEditingRecord] = useState<RecordData | null>(null)
  const [editResult,    setEditResult]    = useState<Result | null>(null)
  const [editNotes,     setEditNotes]     = useState("")
  const [newPhotos,     setNewPhotos]     = useState<PhotoEntry[]>([])
  const [isSaving,      setIsSaving]      = useState(false)
  const [saveError,     setSaveError]     = useState<string | null>(null)

  const fileInputRef   = useRef<HTMLInputElement>(null)
  const cameraInputRef = useRef<HTMLInputElement>(null)

  const recordByStepId = new Map(records.map((r) => [r.stepId, r]))

  // ── Modal open/close ────────────────────────────────────────────────────────

  const openEdit = useCallback((record: RecordData) => {
    setEditingRecord(record)
    setEditResult(record.result)
    setEditNotes(record.notes ?? "")
    setNewPhotos([])
    setSaveError(null)
  }, [])

  const closeEdit = useCallback(() => {
    setNewPhotos((prev) => {
      prev.forEach((p) => URL.revokeObjectURL(p.previewUrl))
      return []
    })
    setEditingRecord(null)
    setEditResult(null)
    setEditNotes("")
    setSaveError(null)
  }, [])

  // ── Photo helpers ───────────────────────────────────────────────────────────

  const handleAddPhotos = useCallback((files: FileList | null) => {
    if (!files) return
    setSaveError(null)
    const incoming: PhotoEntry[] = []
    for (const file of Array.from(files)) {
      if (file.size > 10 * 1024 * 1024) {
        setSaveError(`"${file.name}" exceeds the 10 MB limit`)
        continue
      }
      incoming.push({
        id:         crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      })
    }
    setNewPhotos((prev) => [...prev, ...incoming])
  }, [])

  const handleRemoveNewPhoto = useCallback((id: string) => {
    setNewPhotos((prev) => {
      const entry = prev.find((p) => p.id === id)
      if (entry) URL.revokeObjectURL(entry.previewUrl)
      return prev.filter((p) => p.id !== id)
    })
  }, [])

  // ── Save handler ────────────────────────────────────────────────────────────

  const handleSave = async () => {
    if (!editingRecord || !editResult) return
    const isFail = editResult === "FAIL"
    if (isFail && !editNotes.trim()) {
      setSaveError("Notes are required when result is Fail")
      return
    }

    setIsSaving(true)
    setSaveError(null)

    try {
      // 1. Upload any new photos first
      const newPhotoUrls: string[] = []
      for (const photo of newPhotos) {
        const fd = new FormData()
        fd.append("file", photo.file)
        const res = await fetch("/api/upload", { method: "POST", body: fd })
        if (!res.ok) {
          const data = await res.json().catch(() => ({}))
          throw new Error((data as { error?: string }).error ?? "Photo upload failed")
        }
        const { url } = await res.json()
        newPhotoUrls.push(url as string)
      }

      // 2. PUT the updated record
      const res = await fetch(`/api/inspections/${editingRecord.id}`, {
        method:  "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          result:       editResult,
          notes:        editNotes.trim() || undefined,
          newPhotoUrls,
        }),
      })

      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error((data as { error?: string }).error ?? "Failed to save changes")
      }

      // 3. Close modal and refresh server data
      closeEdit()
      router.refresh()
    } catch (e) {
      setSaveError(e instanceof Error ? e.message : "An unexpected error occurred")
      setIsSaving(false)
    }
  }

  // ── Derived flags ───────────────────────────────────────────────────────────

  const isFail   = editResult === "FAIL"
  const notesOk  = !isFail || editNotes.trim().length > 0
  const canSave  = editResult !== null && notesOk && !isSaving

  const editingStep = editingRecord
    ? steps.find((s) => s.id === editingRecord.stepId)
    : null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      <section>
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
          QA/QC Checklist
        </h2>

        <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
          {steps.map((step) => {
            const record = recordByStepId.get(step.id)
            return (
              <div key={step.id} className="px-5 py-4">
                <div className="flex items-start gap-4">
                  {/* Step number */}
                  <span className="text-xs font-medium text-gray-400 tabular-nums pt-0.5 w-4 shrink-0">
                    {step.stepOrder}.
                  </span>

                  {/* Step body */}
                  <div className="flex-1 min-w-0">
                    <span className="text-sm font-medium text-gray-900">
                      {step.name}
                    </span>
                    {step.description && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {step.description}
                      </p>
                    )}
                    {record && (
                      <div className="mt-2 space-y-1.5">
                        {record.notes && (
                          <p className="text-xs text-gray-600 line-clamp-2">
                            {record.notes}
                          </p>
                        )}
                        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
                          <span>{record.inspectorName}</span>
                          <span>·</span>
                          <span>{formatDate(record.completedAt)}</span>
                          {record.photos.length > 0 && (
                            <>
                              <span>·</span>
                              <span>
                                {record.photos.length}{" "}
                                {record.photos.length === 1 ? "photo" : "photos"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Result badge + Edit button */}
                  <div className="shrink-0 pt-0.5 flex items-center gap-2">
                    {record ? (
                      <>
                        <ResultBadge result={record.result} />
                        {isInspector && (
                          <button
                            type="button"
                            onClick={() => openEdit(record)}
                            aria-label={`Edit step ${step.stepOrder}`}
                            className="text-gray-400 hover:text-gray-600 transition-colors p-0.5 rounded"
                          >
                            <PencilIcon />
                          </button>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-gray-300">Pending</span>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>

        {/* Inspection CTA — inspectors only */}
        {isInspector && (
          <div className="mt-4">
            {recordCount === totalSteps ? (
              <div className="inline-block px-6 py-2.5 rounded-lg bg-green-50 text-green-700 text-sm font-medium">
                Inspection Complete
              </div>
            ) : !hideCta ? (
              <Link
                href={`/panels/${panelId}/inspect`}
                className="inline-block w-full sm:w-auto text-center px-6 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                {recordCount === 0 ? "Start Inspection" : "Continue Inspection"}
              </Link>
            ) : null}
          </div>
        )}
      </section>

      {/* ── Edit Modal ─────────────────────────────────────────────────────────── */}
      {editingRecord && editingStep && (
        <div
          className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center sm:p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget && !isSaving) closeEdit()
          }}
        >
          <div className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-lg max-h-[92vh] overflow-y-auto shadow-xl">

            {/* Modal header */}
            <div className="px-5 pt-5 pb-4 border-b border-gray-100 flex items-start justify-between gap-3">
              <div>
                <p className="text-xs text-gray-400 mb-0.5">
                  Step {editingStep.stepOrder} of {steps.length}
                </p>
                <h3 className="text-base font-semibold text-gray-900 leading-snug">
                  {editingStep.name}
                </h3>
                {editingStep.description && (
                  <p className="text-xs text-gray-500 mt-0.5">
                    {editingStep.description}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={closeEdit}
                disabled={isSaving}
                aria-label="Close"
                className="text-gray-400 hover:text-gray-600 shrink-0 mt-0.5 disabled:opacity-50"
              >
                <svg
                  className="w-5 h-5"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Modal body */}
            <div className="px-5 py-5 space-y-5">

              {/* Result buttons */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-3">Result</p>
                <div className="grid grid-cols-3 gap-3">
                  {(["PASS", "FAIL", "NA"] as const).map((r) => {
                    const isSelected = editResult === r
                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => setEditResult(r)}
                        className={`h-14 rounded-xl text-sm font-semibold transition-all active:scale-95 ${
                          isSelected
                            ? RESULT_ACTIVE[r]
                            : "bg-white border-2 border-gray-200 text-gray-700 hover:border-gray-300"
                        }`}
                      >
                        {RESULT_LABEL[r]}
                      </button>
                    )
                  })}
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
                  value={editNotes}
                  onChange={(e) => setEditNotes(e.target.value)}
                  rows={3}
                  placeholder={
                    isFail
                      ? "Describe the issue (required)…"
                      : "Optional notes…"
                  }
                  className={`w-full rounded-lg px-3 py-2.5 text-sm border resize-none focus:outline-none focus:ring-2 focus:ring-gray-900 transition-colors ${
                    isFail && !editNotes.trim()
                      ? "border-red-300 focus:ring-red-400"
                      : "border-gray-200"
                  }`}
                />
              </div>

              {/* Existing photos (read-only) */}
              {editingRecord.photos.length > 0 && (
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">
                    Existing Photos{" "}
                    <span className="font-normal text-gray-400">
                      ({editingRecord.photos.length})
                    </span>
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {editingRecord.photos.map((photo) => (
                      <div
                        key={photo.id}
                        className="w-20 h-20 rounded-lg overflow-hidden border border-gray-200 shrink-0"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={photo.url}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add new photos */}
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">
                  Add Photos{" "}
                  <span className="font-normal text-gray-400">(optional)</span>
                </p>

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

                {/* New photo thumbnails */}
                {newPhotos.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {newPhotos.map((photo) => (
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
                          onClick={() => handleRemoveNewPhoto(photo.id)}
                          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/60 text-white flex items-center justify-center text-sm leading-none hover:bg-black/80"
                          aria-label="Remove photo"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => cameraInputRef.current?.click()}
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium hover:border-gray-300 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
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
                    className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-medium hover:border-gray-300 transition-colors"
                  >
                    <svg
                      className="w-4 h-4"
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

              {/* Error */}
              {saveError && (
                <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                  {saveError}
                </div>
              )}
            </div>

            {/* Modal footer */}
            <div className="px-5 pb-6 pt-1 flex gap-3">
              <button
                type="button"
                onClick={closeEdit}
                disabled={isSaving}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-gray-700 text-sm font-semibold hover:border-gray-300 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={!canSave}
                className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all ${
                  canSave
                    ? "bg-gray-900 text-white hover:bg-gray-700 active:scale-[0.99]"
                    : "bg-gray-100 text-gray-400 cursor-not-allowed"
                }`}
              >
                {isSaving ? (
                  <span className="flex items-center justify-center gap-2">
                    <SpinnerIcon />
                    Saving…
                  </span>
                ) : (
                  "Save Changes"
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
