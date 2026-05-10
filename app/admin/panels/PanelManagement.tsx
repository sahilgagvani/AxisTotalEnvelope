"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import type { AssemblyType, PanelStatus } from "@prisma/client"

type Panel = {
  id: string
  panelIdentifier: string
  floor: number
  direction: string
  panelNumber: number
  heightMm: number
  widthMm: number
  diagonalMm: number | null
  topOfBottomM: number
  topOfTopM: number
  openingCount: number
  openingCallouts: string | null
  assemblyType: AssemblyType
  isShearWall: boolean
  finishes: string | null
  drawingSheet: string | null
  notes: string | null
  status: PanelStatus
  archivedAt: string | null
  createdAt: string
  _count: { inspectionRecords: number }
}

type ModalMode = "create" | "edit" | "archive" | null

const STATUS_COLORS: Record<PanelStatus, string> = {
  NOT_STARTED: "bg-gray-100 text-gray-500",
  IN_PROGRESS: "bg-amber-50 text-amber-700",
  COMPLETED: "bg-emerald-50 text-emerald-700",
}

const STATUS_LABELS: Record<PanelStatus, string> = {
  NOT_STARTED: "Not Started",
  IN_PROGRESS: "In Progress",
  COMPLETED: "Completed",
}

const ASSEMBLY_COLORS: Record<AssemblyType, string> = {
  EPS: "bg-blue-50 text-blue-700",
  FRR: "bg-orange-50 text-orange-700",
}

/* ── PanelFormModal ──────────────────────────────────────────────────────────── */
function PanelFormModal({
  mode,
  panel,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit"
  panel: Panel | null
  onClose: () => void
  onSaved: (p: Panel) => void
}) {
  const [panelIdentifier, setPanelIdentifier] = useState(panel?.panelIdentifier ?? "")
  const [floor, setFloor] = useState(panel?.floor?.toString() ?? "")
  const [direction, setDirection] = useState(panel?.direction ?? "East")
  const [panelNumber, setPanelNumber] = useState(panel?.panelNumber?.toString() ?? "")
  const [heightMm, setHeightMm] = useState(panel?.heightMm?.toString() ?? "")
  const [widthMm, setWidthMm] = useState(panel?.widthMm?.toString() ?? "")
  const [diagonalMm, setDiagonalMm] = useState(panel?.diagonalMm?.toString() ?? "")
  const [topOfBottomM, setTopOfBottomM] = useState(panel?.topOfBottomM?.toString() ?? "")
  const [topOfTopM, setTopOfTopM] = useState(panel?.topOfTopM?.toString() ?? "")
  const [openingCount, setOpeningCount] = useState(panel?.openingCount?.toString() ?? "0")
  const [openingCalloutsArr, setOpeningCalloutsArr] = useState<string[]>(() => {
    const count = panel?.openingCount ?? 0
    const existing = panel?.openingCallouts ? panel.openingCallouts.split(",").map((s) => s.trim()) : []
    return Array.from({ length: count }, (_, i) => existing[i] ?? "")
  })
  const [assemblyType, setAssemblyType] = useState<AssemblyType>(panel?.assemblyType ?? "EPS")
  const [isShearWall, setIsShearWall] = useState(panel?.isShearWall ?? false)
  const [finishesArr, setFinishesArr] = useState<string[]>(() =>
    panel?.finishes ? panel.finishes.split(",").map((s) => s.trim()).filter(Boolean) : [""]
  )
  const [drawingSheet, setDrawingSheet] = useState(panel?.drawingSheet ?? "")
  const [notes, setNotes] = useState(panel?.notes ?? "")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  async function save() {
    if (!panelIdentifier.trim()) return setError("Panel identifier is required.")
    if (!floor || isNaN(Number(floor))) return setError("Floor must be a number.")
    if (!direction) return setError("Direction is required.")
    if (!panelNumber || isNaN(Number(panelNumber))) return setError("Panel number must be a number.")
    if (!heightMm || isNaN(Number(heightMm))) return setError("Height is required.")
    if (!widthMm || isNaN(Number(widthMm))) return setError("Width is required.")
    if (!topOfBottomM || isNaN(Number(topOfBottomM))) return setError("Top of bottom is required.")
    if (!topOfTopM || isNaN(Number(topOfTopM))) return setError("Top of top is required.")

    setError(null)
    setSaving(true)

    const body = {
      panelIdentifier: panelIdentifier.trim(),
      floor: Number(floor),
      direction,
      panelNumber: Number(panelNumber),
      heightMm: Number(heightMm),
      widthMm: Number(widthMm),
      diagonalMm: diagonalMm ? Number(diagonalMm) : null,
      topOfBottomM: Number(topOfBottomM),
      topOfTopM: Number(topOfTopM),
      openingCount: Number(openingCount) || 0,
      openingCallouts: openingCalloutsArr.filter(Boolean).join(", ") || null,
      assemblyType,
      isShearWall,
      finishes: finishesArr.filter(Boolean).join(", ") || null,
      drawingSheet: drawingSheet.trim() || null,
      notes: notes.trim() || null,
    }

    const url = mode === "create" ? "/api/admin/panels" : `/api/admin/panels/${panel!.id}`
    const method = mode === "create" ? "POST" : "PATCH"

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) return setError(data.error ?? "Something went wrong.")
    onSaved(mode === "create" ? { ...data, _count: { inspectionRecords: 0 } } : { ...panel!, ...data })
  }

  return (
    <Overlay onClose={onClose}>
      <div className="w-full sm:max-w-lg bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100 shrink-0">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === "create" ? "Add Panel" : "Edit Panel"}
          </h2>
          <button
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="px-6 py-5 overflow-y-auto flex-1">
          <div className="space-y-4">
            {/* Identity */}
            <Field label="Panel Identifier">
              <input
                type="text"
                value={panelIdentifier}
                onChange={(e) => setPanelIdentifier(e.target.value)}
                className={inputCls}
                placeholder="e.g. 1E-100"
                autoFocus
              />
            </Field>

            <div className="grid grid-cols-3 gap-3">
              <Field label="Floor">
                <input
                  type="number"
                  value={floor}
                  onChange={(e) => setFloor(e.target.value)}
                  className={inputCls}
                  placeholder="1"
                  min={1}
                />
              </Field>
              <Field label="Direction">
                <select value={direction} onChange={(e) => setDirection(e.target.value)} className={inputCls}>
                  <option>East</option>
                  <option>North</option>
                  <option>South</option>
                  <option>West</option>
                </select>
              </Field>
              <Field label="Panel #">
                <input
                  type="number"
                  value={panelNumber}
                  onChange={(e) => setPanelNumber(e.target.value)}
                  className={inputCls}
                  placeholder="100"
                  min={1}
                />
              </Field>
            </div>

            {/* Dimensions */}
            <div className="grid grid-cols-3 gap-3">
              <Field label="Height (mm)">
                <input type="number" value={heightMm} onChange={(e) => setHeightMm(e.target.value)} className={inputCls} placeholder="3137" min={0} />
              </Field>
              <Field label="Width (mm)">
                <input type="number" value={widthMm} onChange={(e) => setWidthMm(e.target.value)} className={inputCls} placeholder="3139" min={0} />
              </Field>
              <Field label="Diagonal (mm)">
                <input type="number" value={diagonalMm} onChange={(e) => setDiagonalMm(e.target.value)} className={inputCls} placeholder="optional" min={0} />
              </Field>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Field label="Top of Bottom (m)">
                <input type="number" step="0.01" value={topOfBottomM} onChange={(e) => setTopOfBottomM(e.target.value)} className={inputCls} placeholder="72.5" />
              </Field>
              <Field label="Top of Top (m)">
                <input type="number" step="0.01" value={topOfTopM} onChange={(e) => setTopOfTopM(e.target.value)} className={inputCls} placeholder="75.75" />
              </Field>
            </div>

            {/* Assembly */}
            <div className="grid grid-cols-2 gap-3">
              <Field label="Assembly Type">
                <select value={assemblyType} onChange={(e) => setAssemblyType(e.target.value as AssemblyType)} className={inputCls}>
                  <option value="EPS">EPS — StoTherm ci (EPS)</option>
                  <option value="FRR">FRR — StoTherm ci Mineral</option>
                </select>
              </Field>
              <Field label="Openings">
                <input
                  type="number"
                  value={openingCount}
                  onChange={(e) => {
                    const val = e.target.value
                    setOpeningCount(val)
                    const n = Math.max(0, parseInt(val) || 0)
                    setOpeningCalloutsArr((prev) =>
                      Array.from({ length: n }, (_, i) => prev[i] ?? "")
                    )
                  }}
                  className={inputCls}
                  placeholder="0"
                  min={0}
                />
              </Field>
            </div>

            <label className="flex items-center gap-3 cursor-pointer select-none">
              <div
                onClick={() => setIsShearWall((v) => !v)}
                className={`relative w-10 h-6 rounded-full transition-colors ${isShearWall ? "bg-blue-600" : "bg-gray-200"}`}
              >
                <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${isShearWall ? "translate-x-4" : ""}`} />
              </div>
              <span className="text-sm text-gray-700">Shear Wall</span>
            </label>

            {/* Opening callouts — one named cell per opening */}
            {openingCalloutsArr.length > 0 && (
              <Field label="Opening Callouts">
                <div className="flex flex-wrap gap-2">
                  {openingCalloutsArr.map((val, i) => (
                    <div key={i} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-2 py-2 min-w-[80px]">
                      <span className="text-xs text-gray-400 shrink-0 font-medium">#{i + 1}</span>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => {
                          const next = [...openingCalloutsArr]
                          next[i] = e.target.value
                          setOpeningCalloutsArr(next)
                        }}
                        placeholder="e.g. W01R"
                        className="w-20 bg-transparent text-sm text-gray-900 focus:outline-none placeholder-gray-300"
                      />
                    </div>
                  ))}
                </div>
              </Field>
            )}

            {/* Finishes — chips with add/remove */}
            <Field label="Finishes">
              <div className="flex flex-wrap gap-2 items-center">
                {finishesArr.map((val, i) => (
                  <div key={i} className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-gray-50 pl-3 pr-2 py-2">
                    <input
                      type="text"
                      value={val}
                      onChange={(e) => {
                        const next = [...finishesArr]
                        next[i] = e.target.value
                        setFinishesArr(next)
                      }}
                      placeholder="e.g. EF-01"
                      className="w-20 bg-transparent text-sm text-gray-900 focus:outline-none placeholder-gray-300"
                    />
                    {finishesArr.length > 1 && (
                      <button
                        type="button"
                        onClick={() => setFinishesArr((prev) => prev.filter((_, j) => j !== i))}
                        className="flex items-center justify-center w-4 h-4 rounded-full hover:bg-gray-200 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                        aria-label="Remove finish"
                      >
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={() => setFinishesArr((prev) => [...prev, ""])}
                  className="flex items-center justify-center w-8 h-8 rounded-xl border border-dashed border-gray-300 text-gray-400 hover:border-blue-400 hover:text-blue-500 transition-colors"
                  aria-label="Add finish"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                  </svg>
                </button>
              </div>
            </Field>

            <Field label="Drawing Sheet">
              <input type="text" value={drawingSheet} onChange={(e) => setDrawingSheet(e.target.value)} className={inputCls} placeholder="e.g. A4.00a" />
            </Field>

            <Field label="Notes">
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className={`${inputCls} resize-none`}
                rows={2}
                placeholder="e.g. RFI - On Hold"
              />
            </Field>

            {error && <p className="text-sm text-red-500">{error}</p>}

            <button
              onClick={save}
              disabled={saving}
              className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors min-h-[48px]"
            >
              {saving ? "Saving…" : mode === "create" ? "Add Panel" : "Save Changes"}
            </button>
          </div>
        </div>
      </div>
    </Overlay>
  )
}

/* ── ArchiveModal ─────────────────────────────────────────────────────────── */
function ArchiveModal({
  panel,
  onClose,
  onArchived,
}: {
  panel: Panel
  onClose: () => void
  onArchived: (p: Panel) => void
}) {
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function doArchive() {
    setSaving(true)
    setError(null)
    const res = await fetch(`/api/admin/panels/${panel.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archive: true }),
    })
    setSaving(false)
    if (!res.ok) {
      const d = await res.json()
      return setError(d.error ?? "Something went wrong.")
    }
    const updated = await res.json()
    onArchived({ ...panel, ...updated })
  }

  const hasRecords = panel._count.inspectionRecords > 0

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Archive Panel" onClose={onClose}>
        <p className="text-sm text-gray-600 mb-4">
          Archive <span className="font-semibold text-gray-900">{panel.panelIdentifier}</span>?
          It will be hidden from inspectors and the dashboard.
        </p>
        {hasRecords && (
          <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 mb-4">
            <p className="text-sm font-semibold text-amber-700">Inspection records will be locked</p>
            <p className="text-xs text-amber-600 mt-1">
              This panel has {panel._count.inspectionRecords} inspection record{panel._count.inspectionRecords !== 1 ? "s" : ""}. They will become read-only until the panel is reactivated.
            </p>
          </div>
        )}
        {error && <p className="text-sm text-red-500 mb-3">{error}</p>}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[48px]"
          >
            Cancel
          </button>
          <button
            onClick={doArchive}
            disabled={saving}
            className="flex-1 rounded-xl bg-gray-800 px-4 py-3 text-sm font-semibold text-white hover:bg-gray-900 disabled:opacity-40 transition-colors min-h-[48px]"
          >
            {saving ? "Archiving…" : "Archive"}
          </button>
        </div>
      </ModalCard>
    </Overlay>
  )
}

/* ── PanelRow ─────────────────────────────────────────────────────────────── */
function PanelRow({
  panel,
  onEdit,
  onArchive,
  onReactivate,
}: {
  panel: Panel
  onEdit: () => void
  onArchive: () => void
  onReactivate: () => void
}) {
  const isArchived = !!panel.archivedAt

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 min-h-[64px] ${isArchived ? "opacity-50" : ""}`}>
      {/* Status dot */}
      <span className={`flex-shrink-0 w-2 h-2 rounded-full mt-0.5 ${
        panel.status === "COMPLETED" ? "bg-emerald-500" :
        panel.status === "IN_PROGRESS" ? "bg-amber-400" :
        "bg-gray-300"
      }`} />

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 font-mono">{panel.panelIdentifier}</span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[panel.status]}`}>
            {STATUS_LABELS[panel.status]}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ASSEMBLY_COLORS[panel.assemblyType]}`}>
            {panel.assemblyType}
          </span>
          {panel.isShearWall && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-purple-50 text-purple-700">
              Shear Wall
            </span>
          )}
          {isArchived && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
              Archived
            </span>
          )}
        </div>
        <span className="block text-xs text-gray-400 mt-0.5">
          {panel.heightMm} × {panel.widthMm} mm
          {panel.openingCount > 0 ? ` · ${panel.openingCount} opening${panel.openingCount !== 1 ? "s" : ""}` : ""}
          {panel.drawingSheet ? ` · ${panel.drawingSheet}` : ""}
        </span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {isArchived ? (
          <button
            onClick={onReactivate}
            className="text-xs font-medium text-blue-600 hover:text-blue-700 px-2 py-1 min-h-[44px] flex items-center"
          >
            Reactivate
          </button>
        ) : (
          <>
            <button
              onClick={onEdit}
              aria-label="Edit panel"
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 15H9v-3z" />
              </svg>
            </button>
            <button
              onClick={onArchive}
              aria-label="Archive panel"
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
              </svg>
            </button>
          </>
        )}
      </div>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function PanelManagement() {
  const [panels, setPanels] = useState<Panel[]>([])
  const [loading, setLoading] = useState(true)
  const [showArchived, setShowArchived] = useState(false)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [activePanel, setActivePanel] = useState<Panel | null>(null)

  useEffect(() => {
    fetch("/api/admin/panels")
      .then((r) => r.json())
      .then((data) => { setPanels(data); setLoading(false) })
  }, [])

  function openCreate() { setActivePanel(null); setModalMode("create") }
  function openEdit(p: Panel) { setActivePanel(p); setModalMode("edit") }
  function openArchive(p: Panel) { setActivePanel(p); setModalMode("archive") }
  function closeModal() { setModalMode(null); setActivePanel(null) }

  function onSaved(updated: Panel) {
    setPanels((prev) => {
      const idx = prev.findIndex((p) => p.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [...prev, updated]
    })
    closeModal()
  }

  function onArchived(updated: Panel) {
    setPanels((prev) => prev.map((p) => p.id === updated.id ? updated : p))
    closeModal()
  }

  async function reactivate(p: Panel) {
    const res = await fetch(`/api/admin/panels/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reactivate: true }),
    })
    if (res.ok) {
      const updated = await res.json()
      setPanels((prev) => prev.map((x) => x.id === p.id ? { ...p, ...updated } : x))
    }
  }

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  const visible = showArchived ? panels : panels.filter((p) => !p.archivedAt)
  const archived = panels.filter((p) => !!p.archivedAt)
  const activeCount = panels.filter((p) => !p.archivedAt).length

  // Group by floor then direction
  const groups: { key: string; floor: number; direction: string; panels: Panel[] }[] = []
  for (const p of visible) {
    const key = `${p.floor}-${p.direction}`
    const existing = groups.find((g) => g.key === key)
    if (existing) existing.panels.push(p)
    else groups.push({ key, floor: p.floor, direction: p.direction, panels: [p] })
  }

  return (
    <main className="flex-1">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8">

        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/dashboard"
            className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
            aria-label="Back"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900">Panel Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {activeCount} active panel{activeCount !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors min-h-[44px] shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add Panel
          </button>
        </div>

        {/* Panel list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {groups.length === 0 ? (
              <div className="bg-white border border-gray-200 rounded-xl">
                <p className="text-sm text-gray-400 px-4 py-8 text-center">No panels yet. Add one above.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {groups.map(({ key, floor, direction, panels: groupPanels }) => {
                  const isCollapsed = collapsedGroups.has(key)
                  return (
                    <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                      {/* Section header */}
                      <button
                        onClick={() => toggleGroup(key)}
                        className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-gray-800">
                            Floor {floor} — {direction}
                          </span>
                          <span className="text-xs text-gray-400 font-medium">
                            {groupPanels.length} panel{groupPanels.length !== 1 ? "s" : ""}
                          </span>
                        </div>
                        <svg
                          className={`w-4 h-4 text-gray-400 transition-transform ${isCollapsed ? "-rotate-90" : ""}`}
                          fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>

                      {!isCollapsed && (
                        <div className="divide-y divide-gray-100 border-t border-gray-100">
                          {groupPanels.map((p) => (
                            <PanelRow
                              key={p.id}
                              panel={p}
                              onEdit={() => openEdit(p)}
                              onArchive={() => openArchive(p)}
                              onReactivate={() => reactivate(p)}
                            />
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {archived.length > 0 && (
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
              >
                {showArchived
                  ? `Hide ${archived.length} archived panel${archived.length !== 1 ? "s" : ""}`
                  : `Show ${archived.length} archived panel${archived.length !== 1 ? "s" : ""}`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {(modalMode === "create" || modalMode === "edit") && (
        <PanelFormModal
          mode={modalMode}
          panel={activePanel}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
      {modalMode === "archive" && activePanel && (
        <ArchiveModal panel={activePanel} onClose={closeModal} onArchived={onArchived} />
      )}
    </main>
  )
}

/* ── Shared UI primitives ─────────────────────────────────────────────────── */
const inputCls =
  "w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition min-h-[48px]"

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
        {label}
      </label>
      {children}
    </div>
  )
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 px-0 sm:px-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      {children}
    </div>
  )
}

function ModalCard({
  title,
  children,
  onClose,
}: {
  title: string
  children: React.ReactNode
  onClose: () => void
}) {
  return (
    <div className="w-full sm:max-w-sm bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-900">{title}</h2>
        <button
          onClick={onClose}
          className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      <div className="px-6 py-5">{children}</div>
    </div>
  )
}
