"use client"

import { useState } from "react"
import Link from "next/link"
import { PanelStatus, AssemblyType } from "@prisma/client"

type Panel = {
  id: string
  panelIdentifier: string
  floor: number
  direction: string
  panelNumber: number
  assemblyType: AssemblyType | null
  drawingSheet: string | null
  status: PanelStatus
}

function StatusBadge({ status }: { status: PanelStatus }) {
  const styles: Record<PanelStatus, string> = {
    NOT_STARTED: "bg-gray-100 text-gray-600",
    IN_PROGRESS: "bg-blue-50 text-blue-700",
    COMPLETED:   "bg-green-50 text-green-700",
  }
  const labels: Record<PanelStatus, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED:   "Completed",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function AssemblyBadge({ type }: { type: AssemblyType | null }) {
  if (!type) return <span className="text-gray-400 text-xs">—</span>
  const styles: Record<AssemblyType, string> = {
    EPS: "bg-amber-50 text-amber-700",
    FRR: "bg-purple-50 text-purple-700",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[type]}`}>
      {type}
    </span>
  )
}

export default function PanelList({ panels }: { panels: Panel[] }) {
  const groups: { key: string; floor: number; direction: string; panels: Panel[] }[] = []
  for (const p of panels) {
    const key = `${p.floor}-${p.direction}`
    const existing = groups.find((g) => g.key === key)
    if (existing) existing.panels.push(p)
    else groups.push({ key, floor: p.floor, direction: p.direction, panels: [p] })
  }

  const allKeys = groups.map((g) => g.key)
  const [collapsedGroups, setCollapsedGroups] = useState<Set<string>>(new Set(allKeys))

  function toggleGroup(key: string) {
    setCollapsedGroups((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  if (panels.length === 0) {
    return <p className="text-gray-500 text-sm">No panels yet.</p>
  }

  const allExpanded = collapsedGroups.size === 0
  const allCollapsed = collapsedGroups.size === allKeys.length

  return (
    <>
      {/* Toolbar */}
      <div className="flex items-center justify-end gap-1 mb-2">
        <button
          onClick={() => setCollapsedGroups(new Set())}
          disabled={allExpanded}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors min-h-[36px] ${
            allExpanded
              ? "text-gray-300 cursor-default"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
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
            allCollapsed
              ? "text-gray-300 cursor-default"
              : "text-gray-500 hover:text-gray-800 hover:bg-gray-100"
          }`}
        >
          <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
          Collapse all
        </button>
      </div>

      <div className="space-y-3">
        {groups.map(({ key, floor, direction, panels: groupPanels }) => {
          const isCollapsed = collapsedGroups.has(key)
          return (
            <div key={key} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              {/* Group header */}
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
                <>
                  {/* Mobile card list (below md) */}
                  <div className="md:hidden divide-y divide-gray-100 border-t border-gray-100">
                    {groupPanels.map((panel) => (
                      <Link
                        key={panel.id}
                        href={`/panels/${panel.id}`}
                        className="flex items-start justify-between gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 min-h-[64px]"
                      >
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 text-sm mb-1.5">
                            {panel.panelIdentifier}
                          </div>
                          <div className="flex flex-wrap items-center gap-2">
                            <AssemblyBadge type={panel.assemblyType} />
                            <span className="text-xs text-gray-500">
                              Floor {panel.floor} · {panel.direction} · #{panel.panelNumber}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 pt-0.5">
                          <StatusBadge status={panel.status} />
                        </div>
                      </Link>
                    ))}
                  </div>

                  {/* Desktop table (md+) */}
                  <div className="hidden md:block overflow-x-auto border-t border-gray-100">
                    <table className="min-w-full divide-y divide-gray-100">
                      <thead className="bg-gray-50">
                        <tr>
                          {["Panel ID", "Assembly", "Floor", "Direction", "Drawing", "Status"].map((h) => (
                            <th
                              key={h}
                              className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                            >
                              {h}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {groupPanels.map((panel) => (
                          <tr key={panel.id} className="hover:bg-gray-50">
                            <td className="px-4 py-3">
                              <Link
                                href={`/panels/${panel.id}`}
                                className="font-medium text-gray-900 hover:text-blue-600"
                              >
                                {panel.panelIdentifier}
                              </Link>
                            </td>
                            <td className="px-4 py-3">
                              <AssemblyBadge type={panel.assemblyType} />
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                              {panel.floor}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {panel.direction}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              {panel.drawingSheet ?? "—"}
                            </td>
                            <td className="px-4 py-3">
                              <StatusBadge status={panel.status} />
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}
