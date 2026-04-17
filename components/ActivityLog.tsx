"use client"

import { useState } from "react"

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AuditLogEntry {
  id: string
  action: string
  userName: string
  stepName: string
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

// ── Build human-readable log line ─────────────────────────────────────────────

function LogLine({ log }: { log: AuditLogEntry }) {
  const notesChanged =
    log.action === "UPDATED" && log.previousNotes !== log.newNotes

  if (log.action === "CREATED") {
    return (
      <span>
        <span className="font-medium text-gray-900">{log.userName}</span>{" "}
        <span className="text-gray-500">completed</span>{" "}
        <span className="text-gray-900">{log.stepName}</span>{" "}
        {log.newResult && (
          <>
            <span className="text-gray-300 mx-1">→</span>
            <InlineResultBadge result={log.newResult} />
          </>
        )}
      </span>
    )
  }

  if (log.action === "UPDATED") {
    const resultChanged = log.previousResult !== log.newResult

    if (resultChanged) {
      return (
        <span>
          <span className="font-medium text-gray-900">{log.userName}</span>{" "}
          <span className="text-gray-500">updated</span>{" "}
          <span className="text-gray-900">{log.stepName}</span>{" "}
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
      )
    }

    // Notes-only change
    return (
      <span>
        <span className="font-medium text-gray-900">{log.userName}</span>{" "}
        <span className="text-gray-500">updated notes on</span>{" "}
        <span className="text-gray-900">{log.stepName}</span>
      </span>
    )
  }

  // Fallback for unknown action types
  return (
    <span>
      <span className="font-medium text-gray-900">{log.userName}</span>{" "}
      <span className="text-gray-500 lowercase">{log.action}</span>{" "}
      <span className="text-gray-900">{log.stepName}</span>
    </span>
  )
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ActivityLog({ logs }: ActivityLogProps) {
  const [showAll, setShowAll] = useState(false)

  if (logs.length === 0) return null

  const visible   = showAll ? logs : logs.slice(0, PAGE_SIZE)
  const hasMore   = logs.length > PAGE_SIZE

  return (
    <section>
      <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
        Activity
      </h2>

      <div className="bg-white border border-gray-200 rounded-lg divide-y divide-gray-100">
        {visible.map((log) => (
          <div key={log.id} className="px-5 py-3 text-sm">
            <LogLine log={log} />
            <div className="mt-0.5 text-xs text-gray-400">
              {formatDate(log.timestamp)}
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
