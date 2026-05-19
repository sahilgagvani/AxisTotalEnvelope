"use client"

import { useEffect, useRef, useState } from "react"
import { useSession } from "next-auth/react"

interface UserOption {
  id: string
  name: string | null
  role: "ADMIN" | "QC_INSPECTOR" | "ENGINEER"
}

const roleLabel: Record<UserOption["role"], string> = {
  ADMIN:        "Admin",
  QC_INSPECTOR: "Inspector",
  ENGINEER:     "Engineer",
}

const roleBadgeClass: Record<UserOption["role"], string> = {
  ADMIN:        "bg-blue-50 text-blue-700",
  QC_INSPECTOR: "bg-purple-50 text-purple-700",
  ENGINEER:     "bg-amber-50 text-amber-700",
}

interface Props {
  panelId: string
  panelIdentifier: string
}

export default function NotifyButton({ panelId, panelIdentifier }: Props) {
  const { data: session } = useSession()
  const [open, setOpen]           = useState(false)
  const [users, setUsers]         = useState<UserOption[]>([])
  const [search, setSearch]       = useState("")
  const [selected, setSelected]   = useState<Set<string>>(new Set())
  const [message, setMessage]     = useState("")
  const [loading, setLoading]     = useState(false)
  const [sending, setSending]     = useState(false)
  const [success, setSuccess]     = useState(false)
  const overlayRef                = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    setLoading(true)
    setSelected(new Set())
    setMessage("")
    setSuccess(false)
    setSearch("")
    fetch("/api/users/notify-list")
      .then((r) => r.json())
      .then((data: UserOption[]) => setUsers(data))
      .finally(() => setLoading(false))
  }, [open])

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  async function handleSend() {
    if (selected.size === 0) return
    setSending(true)
    try {
      const res = await fetch("/api/notifications", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          panelId,
          recipientIds: [...selected],
          message: message.trim() || undefined,
        }),
      })
      if (res.ok) {
        setSuccess(true)
        setTimeout(() => setOpen(false), 1200)
      }
    } finally {
      setSending(false)
    }
  }

  const filtered = users.filter((u) =>
    (u.name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        Notify
      </button>

      {/* Modal */}
      {open && (
        <div
          ref={overlayRef}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50"
          onClick={(e) => { if (e.target === overlayRef.current) setOpen(false) }}
        >
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 flex flex-col max-h-[85vh]">

            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-6 pb-4 shrink-0">
              <div>
                <p className="text-base font-semibold text-gray-900">Notify team</p>
                <p className="text-xs text-gray-400 mt-0.5">Panel {panelIdentifier}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
                aria-label="Close"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Search */}
            <div className="px-6 pb-3 shrink-0">
              <input
                type="text"
                placeholder="Search users…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            {/* User list */}
            <div className="flex-1 overflow-y-auto px-6 pb-2 min-h-0">
              {loading ? (
                <p className="text-sm text-gray-400 py-4 text-center">Loading…</p>
              ) : filtered.length === 0 ? (
                <p className="text-sm text-gray-400 py-4 text-center">No users found</p>
              ) : (
                <ul className="divide-y divide-gray-100">
                  {filtered.map((u) => (
                    <li key={u.id}>
                      <label className="flex items-center gap-3 py-2.5 cursor-pointer group">
                        <input
                          type="checkbox"
                          checked={selected.has(u.id)}
                          onChange={() => toggle(u.id)}
                          className="w-4 h-4 rounded border-gray-300 text-gray-900 focus:ring-gray-900/20 cursor-pointer"
                        />
                        <span className="flex-1 text-sm text-gray-800 group-hover:text-gray-900">
                          {u.name ?? u.id}
                        </span>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeClass[u.role]}`}>
                          {roleLabel[u.role]}
                        </span>
                      </label>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Optional message */}
            <div className="px-6 pt-2 pb-3 shrink-0 border-t border-gray-100">
              <textarea
                placeholder="Add a note (optional)"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                maxLength={280}
                rows={2}
                className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 resize-none focus:outline-none focus:ring-2 focus:ring-gray-900/20"
              />
            </div>

            {/* Footer */}
            <div className="px-6 pb-6 shrink-0">
              {success ? (
                <div className="flex items-center justify-center gap-2 py-2.5 text-sm font-medium text-green-700">
                  <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  Notifications sent
                </div>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={selected.size === 0 || sending}
                  className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 disabled:opacity-40 transition-colors"
                >
                  {sending ? "Sending…" : `Notify ${selected.size > 0 ? selected.size : ""} ${selected.size === 1 ? "person" : "people"}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
