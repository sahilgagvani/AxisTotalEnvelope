"use client"

import { useState } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  action: string
  userName: string
  stepName: string
  stepOrder: number | null
  timestamp: string       // ISO string — serialized from server
  previousResult: string | null
  newResult: string | null
  previousNotes: string | null
  newNotes: string | null
}

export interface ActivityLogProps {
  logs: AuditLogEntry[]
}

const PAGE_SIZE = 20

type GroupBy = "date" | "step"

// ── Result badge ──────────────────────────────────────────────────────────────

const BADGE_STYLE: Record<string, string> = {
  PASS: "bg-green-50 text-green-700",
  FAIL: "bg-red-50 text-red-700",
  NA:   "bg-gray-100 text-gray-500",
}

const BADGE_LABEL: Record<string, string> = {
  PASS: "Pass",
  FAIL: "Fail",
  NA:   "N/A",
}

function InlineResultBadge({ result }: { result: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
        BADGE_STYLE[result] ?? "bg-gray-100 text-gray-500"
      }`}
    >
      {BADGE_LABEL[result] ?? result}
    </span>
  )
}

// ── Format timestamp ──────────────────────────────────────────────────────────

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

function formatDateKey(iso: string): string {
  const d = new Date(iso)
  const today     = new Date()
  const yesterday = new Date()
  yesterday.setDate(today.getDate() - 1)

  const isSameDay = (a: Date, b: Date) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth()    === b.getMonth()    &&
    a.getDate()     === b.getDate()

  if (isSameDay(d, today))     return "Today"
  if (isSameDay(d, yesterday)) return "Yesterday"

  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day:   "numeric",
    year:  "numeric",
  }).format(d)
}

function calendarDay(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`
}

// ── Step label ────────────────────────────────────────────────────────────────

function StepLabel({ log }: { log: AuditLogEntry }) {
  return (
    <span className="text-gray-900">
      {log.stepOrder != null && (
        <span className="text-gray-400 mr-1">#{log.stepOrder}</span>
      )}
      {log.stepName}
    </span>
  )
}

// ── Build human-readable log line ─────────────────────────────────────────────

function LogLine({
  log,
  expanded,
  onToggleNotes,
}: {
  log: AuditLogEntry
  expanded: boolean
  onToggleNotes: () => void
}) {
  const notesChanged =
    log.action === "UPDATED" && log.previousNotes !== log.newNotes

  const renderNotesDiff = () => (
    <div className="mt-2 bg-gray-50 rounded-lg px-3 py-2 space-y-1.5">
      <div>
        <span className="text-xs text-gray-400 font-medium">Before  </span>
        <span className="text-xs text-gray-600">
          {log.previousNotes ?? <em className="text-gray-300">empty</em>}
        </span>
      </div>
      <div>
        <span className="text-xs text-gray-400 font-medium">After  </span>
        <span className="text-xs text-gray-600">
          {log.newNotes ?? <em className="text-gray-300">empty</em>}
        </span>
      </div>
    </div>
  )

  if (log.action === "CREATED") {
    return (
      <div>
        <span>
          <span className="font-medium text-gray-900">{log.userName}</span>{" "}
          <span className="text-gray-500">completed</span>{" "}
          <StepLabel log={log} />
          {log.newResult && (
            <>
              <span className="text-gray-300 mx-1">→</span>
              <InlineResultBadge result={log.newResult} />
            </>
          )}
        </span>
        {notesChanged && (
          <>
            <button
              type="button"
              onClick={onToggleNotes}
              className="ml-2 text-xs text-amber-600 hover:text-amber-700 underline underline-offset-2"
            >
              {expanded ? "hide notes" : "show notes"}
            </button>
            {expanded && renderNotesDiff()}
          </>
        )}
      </div>
    )
  }

  if (log.action === "UPDATED") {
    const resultChanged = log.previousResult !== log.newResult

    if (resultChanged) {
      return (
        <div>
          <span>
            <span className="font-medium text-gray-900">{log.userName}</span>{" "}
            <span className="text-gray-500">updated</span>{" "}
            <StepLabel log={log} />{" "}
            {log.previousResult && (
              <InlineResultBadge result={log.previousResult} />
            )}
            <span className="text-gray-300 mx-1">→</span>
            {log.newResult && <InlineResultBadge result={log.newResult} />}
            {notesChanged && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-50 text-amber-600 px-1.5 py-0.5 text-xs font-medium">
                notes changed
              </span>
            )}
          </span>
          {notesChanged && (
            <>
              <button
                type="button"
                onClick={onToggleNotes}
                className="ml-2 text-xs text-amber-600 hover:text-amber-700 underline underline-offset-2"
              >
                {expanded ? "hide notes" : "show notes"}
              </button>
              {expanded && renderNotesDiff()}
            </>
          )}
        </div>
      )
    }

    // Notes-only change
    return (
      <div>
        <span>
          <span className="font-medium text-gray-900">{log.userName}</span>{" "}
          <span className="text-gray-500">updated notes on</span>{" "}
          <StepLabel log={log} />
        </span>
        {notesChanged && (
          <>
            <button
              type="button"
              onClick={onToggleNotes}
              className="ml-2 text-xs text-amber-600 hover:text-amber-700 underline underline-offset-2"
            >
              {expanded ? "hide notes" : "show notes"}
            </button>
            {expanded && renderNotesDiff()}
          </>
        )}
      </div>
    )
  }

  // Fallback for unknown action types
  return (
    <span>
      <span className="font-medium text-gray-900">{log.userName}</span>{" "}
      <span className="text-gray-500 lowercase">{log.action}</span>{" "}
      <StepLabel log={log} />
    </span>
  )
}

// ── Group helpers ─────────────────────────────────────────────────────────────

function groupByDate(logs: AuditLogEntry[]): { key: string; label: string; entries: AuditLogEntry[] }[] {
  const map = new Map<string, { label: string; entries: AuditLogEntry[] }>()
  for (const log of logs) {
    const key   = calendarDay(log.timestamp)
    const label = formatDateKey(log.timestamp)
    if (!map.has(key)) map.set(key, { label, entries: [] })
    map.get(key)!.entries.push(log)
  }
  return Array.from(map.entries()).map(([key, v]) => ({ key, ...v }))
}

function groupByStep(logs: AuditLogEntry[]): { key: string; label: string; entries: AuditLogEntry[] }[] {
  const map = new Map<string, { label: string; entries: AuditLogEntry[] }>()
  for (const log of logs) {
    const key   = log.stepName
    const order = log.stepOrder != null ? `#${log.stepOrder} ` : ""
    const label = `${order}${log.stepName}`
    if (!map.has(key)) map.set(key, { label, entries: [] })
    map.get(key)!.entries.push(log)
  }
  // Sort within each step by timestamp desc
  for (const v of map.values()) {
    v.entries.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
  }
  // Sort groups by earliest stepOrder
  return Array.from(map.entries())
    .map(([key, v]) => ({ key, ...v }))
    .sort((a, b) => {
      const aOrder = a.entries[0]?.stepOrder ?? Infinity
      const bOrder = b.entries[0]?.stepOrder ?? Infinity
      return aOrder - bOrder
    })
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ActivityLog({ logs }: ActivityLogProps) {
  const [showAll,         setShowAll]         = useState(false)
  const [groupBy,         setGroupBy]         = useState<GroupBy>("date")
  const [expandedNoteId,  setExpandedNoteId]  = useState<string | null>(null)

  if (logs.length === 0) return null

  const visible = showAll ? logs : logs.slice(0, PAGE_SIZE)
  const hasMore = logs.length > PAGE_SIZE

  const groups = groupBy === "date" ? groupByDate(visible) : groupByStep(visible)

  const toggleNotes = (id: string) =>
    setExpandedNoteId((prev) => (prev === id ? null : id))

  return (
    <section>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide">
          Activity
        </h2>
        {/* Grouping toggle */}
        <div className="flex items-center rounded-full border border-gray-200 overflow-hidden text-xs font-medium">
          <button
            type="button"
            onClick={() => setGroupBy("date")}
            className={`px-3 py-1 transition-colors ${
              groupBy === "date"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            By Date
          </button>
          <button
            type="button"
            onClick={() => setGroupBy("step")}
            className={`px-3 py-1 transition-colors ${
              groupBy === "step"
                ? "bg-gray-900 text-white"
                : "text-gray-500 hover:text-gray-700"
            }`}
          >
            By Step
          </button>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
        {groups.map((group, gi) => (
          <div key={group.key}>
            {/* Group divider */}
            <div className="px-5 py-2 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                {group.label}
              </span>
            </div>
            {/* Entries */}
            <div className={gi < groups.length - 1 ? "divide-y divide-gray-100 border-b border-gray-100" : "divide-y divide-gray-100"}>
              {group.entries.map((log) => (
                <div key={log.id} className="px-5 py-3 text-sm">
                  <LogLine
                    log={log}
                    expanded={expandedNoteId === log.id}
                    onToggleNotes={() => toggleNotes(log.id)}
                  />
                  <div className="mt-0.5 text-xs text-gray-400">
                    {formatDate(log.timestamp)}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {hasMore && (
        <button
          type="button"
          onClick={() => setShowAll((v) => !v)}
          className="mt-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
        >
          {showAll
            ? "Show less"
            : `Show ${logs.length - PAGE_SIZE} more`}
        </button>
      )}
    </section>
  )
}
