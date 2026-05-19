"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import QRCode from "qrcode"
import type { PanelStatus } from "@prisma/client"

type Panel = {
  id: string
  panelIdentifier: string
  floor: number
  direction: string
  panelNumber: number
  status: PanelStatus
  archivedAt: string | null
}

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

/* ── QR Tile ──────────────────────────────────────────────────────────────── */
function QrTile({
  panel,
  selected,
  onToggle,
}: {
  panel: Panel
  selected: boolean
  onToggle: () => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, panel.id, {
      width: 120,
      margin: 1,
      color: { dark: "#111827", light: "#ffffff" },
    })
  }, [panel.id])

  return (
    <div
      onClick={onToggle}
      className={`relative cursor-pointer rounded-xl border-2 p-3 flex flex-col items-center gap-2 transition-all select-none ${
        selected
          ? "border-blue-500 bg-blue-50 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50"
      }`}
    >
      {/* Checkbox overlay */}
      <div
        className={`absolute top-2 left-2 w-5 h-5 rounded-md border-2 flex items-center justify-center transition-colors ${
          selected ? "border-blue-500 bg-blue-500" : "border-gray-300 bg-white"
        }`}
      >
        {selected && (
          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </div>

      {/* QR Code */}
      <div className="rounded-lg overflow-hidden border border-gray-100 bg-white p-0.5 mt-2">
        <canvas ref={canvasRef} className="block" />
      </div>

      {/* Labels */}
      <div className="text-center w-full">
        <p className="text-xs font-semibold text-gray-900 font-mono truncate">{panel.panelIdentifier}</p>
        <p className="text-xs text-gray-400 mt-0.5">Floor {panel.floor} · {panel.direction}</p>
        <span className={`inline-flex items-center rounded-full px-1.5 py-0.5 text-xs font-medium mt-1 ${STATUS_COLORS[panel.status]}`}>
          {STATUS_LABELS[panel.status]}
        </span>
      </div>
    </div>
  )
}

/* ── Print QR Card (rendered in print-area only) ───────────────────────────── */
function PrintQrCard({ panel }: { panel: Panel }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvasRef.current) return
    QRCode.toCanvas(canvasRef.current, panel.id, {
      width: 200,
      margin: 2,
      color: { dark: "#000000", light: "#ffffff" },
    })
  }, [panel.id])

  return (
    <div className="print-card">
      <canvas ref={canvasRef} />
      <p className="print-identifier">{panel.panelIdentifier}</p>
      <p className="print-sublabel">Floor {panel.floor} · {panel.direction}</p>
    </div>
  )
}

/* ── Main component ──────────────────────────────────────────────────────── */
export default function QrManagement() {
  const [panels, setPanels] = useState<Panel[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set())

  useEffect(() => {
    fetch("/api/admin/panels")
      .then((r) => r.json())
      .then((data: Panel[]) => {
        const active = data.filter((p) => !p.archivedAt)
        setPanels(active)
        const keys = new Set(active.map((p) => `${p.floor}-${p.direction}`))
        setCollapsedGroups(keys)
        setLoading(false)
      })
  }, [])

  function togglePanel(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleGroup(groupPanels: Panel[]) {
    const ids = groupPanels.map((p) => p.id)
    const allSelected = ids.every((id) => selected.has(id))
    setSelected((prev) => {
      const next = new Set(prev)
      if (allSelected) ids.forEach((id) => next.delete(id))
      else ids.forEach((id) => next.add(id))
      return next
    })
  }

  function selectAll() {
    setSelected(new Set(panels.map((p) => p.id)))
  }

  function clearAll() {
    setSelected(new Set())
  }

  function toggleCollapseGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function handlePrint() {
    window.print()
  }

  // Group panels by floor+direction
  const groups: { key: string; floor: number; direction: string; panels: Panel[] }[] = []
  for (const p of panels) {
    const key = `${p.floor}-${p.direction}`
    const existing = groups.find((g) => g.key === key)
    if (existing) existing.panels.push(p)
    else groups.push({ key, floor: p.floor, direction: p.direction, panels: [p] })
  }

  const selectedPanels = panels.filter((p) => selected.has(p.id))
  const allKeys = groups.map((g) => g.key)
  const allExpanded = collapsedGroups.size === 0
  const allCollapsed = collapsedGroups.size === allKeys.length

  return (
    <>
      {/* Print styles */}
      <style>{`
        @media print {
          body > * { display: none !important; }
          #print-area { display: block !important; }
        }
        #print-area { display: none; }
        .print-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 24px;
          padding: 24px;
        }
        .print-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          padding: 16px;
          break-inside: avoid;
        }
        .print-identifier {
          font-family: monospace;
          font-size: 14px;
          font-weight: 700;
          color: #111827;
          margin-top: 8px;
          text-align: center;
        }
        .print-sublabel {
          font-size: 11px;
          color: #9ca3af;
          margin-top: 2px;
          text-align: center;
        }
      `}</style>

      {/* Print area (hidden on screen, shown on print) */}
      <div id="print-area">
        <div className="print-grid">
          {selectedPanels.map((p) => (
            <PrintQrCard key={p.id} panel={p} />
          ))}
        </div>
      </div>

      <main className="flex-1">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">

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
              <h1 className="text-xl font-bold text-gray-900">QR Codes</h1>
              <p className="text-sm text-gray-400 mt-0.5">
                {panels.length} panel{panels.length !== 1 ? "s" : ""}
                {selected.size > 0 ? ` · ${selected.size} selected` : ""}
              </p>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              {selected.size < panels.length ? (
                <button
                  onClick={selectAll}
                  disabled={loading || panels.length === 0}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors min-h-[44px]"
                >
                  Select All
                </button>
              ) : (
                <button
                  onClick={clearAll}
                  className="flex items-center gap-1.5 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[44px]"
                >
                  Clear
                </button>
              )}
              <button
                onClick={handlePrint}
                disabled={selected.size === 0}
                className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors min-h-[44px]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                </svg>
                {selected.size > 0 ? `Print Selected (${selected.size})` : "Print Selected"}
              </button>
            </div>
          </div>

          {/* Expand / Collapse all */}
          {!loading && groups.length > 0 && (
            <div className="flex items-center justify-end gap-1 mb-2">
              <button
                onClick={() => setCollapsedGroups(new Set())}
                disabled={allExpanded}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                  allExpanded ? "text-gray-300 cursor-default" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
                Expand all
              </button>
              <div className="w-px h-4 bg-gray-200" />
              <button
                onClick={() => setCollapsedGroups(new Set(allKeys))}
                disabled={allCollapsed}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
                  allCollapsed ? "text-gray-300 cursor-default" : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
                }`}
              >
                <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
                Collapse all
              </button>
            </div>
          )}

          {/* Panel grid */}
          {loading ? (
            <div className="flex justify-center py-12">
              <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
            </div>
          ) : groups.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl">
              <p className="text-sm text-gray-400 px-4 py-8 text-center">No panels yet. Add panels in Panel Management.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map(({ key, floor, direction, panels: groupPanels }) => {
                const isCollapsed = collapsedGroups.has(key)
                const groupIds = groupPanels.map((p) => p.id)
                const allGroupSelected = groupIds.every((id) => selected.has(id))
                const someGroupSelected = groupIds.some((id) => selected.has(id))

                return (
                  <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                    {/* Group header */}
                    <div className="flex items-center px-4 py-3 hover:bg-gray-50 transition-colors">
                      {/* Group checkbox */}
                      <div
                        onClick={() => toggleGroup(groupPanels)}
                        className={`mr-3 w-5 h-5 rounded-md border-2 flex items-center justify-center cursor-pointer shrink-0 transition-colors ${
                          allGroupSelected
                            ? "border-blue-500 bg-blue-500"
                            : someGroupSelected
                            ? "border-blue-400 bg-blue-100"
                            : "border-gray-300 bg-white hover:border-gray-400"
                        }`}
                      >
                        {allGroupSelected ? (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                          </svg>
                        ) : someGroupSelected ? (
                          <span className="w-2 h-0.5 bg-blue-500 block" />
                        ) : null}
                      </div>

                      <button
                        onClick={() => toggleCollapseGroup(key)}
                        className="flex-1 flex items-center justify-between min-h-[32px]"
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
                    </div>

                    {!isCollapsed && (
                      <div className="border-t border-gray-100 p-4">
                        <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-5 gap-3">
                          {groupPanels.map((p) => (
                            <QrTile
                              key={p.id}
                              panel={p}
                              selected={selected.has(p.id)}
                              onToggle={() => togglePanel(p.id)}
                            />
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </main>
    </>
  )
}
