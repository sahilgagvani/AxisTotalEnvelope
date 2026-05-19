"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import { useRouter } from "next/navigation"

interface NotificationItem {
  id: string
  panelId: string
  message: string | null
  readAt: string | null
  createdAt: string
  sender: { name: string | null }
  panel:  { id: string; panelIdentifier: string }
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins  = Math.floor(diff / 60000)
  if (mins < 1)  return "just now"
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

export default function NotificationInbox() {
  const router                          = useRouter()
  const [open, setOpen]                 = useState(false)
  const [items, setItems]               = useState<NotificationItem[]>([])
  const [unreadCount, setUnreadCount]   = useState(0)
  const dropdownRef                     = useRef<HTMLDivElement>(null)

  const fetchNotifications = useCallback(async () => {
    const res = await fetch("/api/notifications")
    if (!res.ok) return
    const data: NotificationItem[] = await res.json()
    setItems(data)
    setUnreadCount(data.filter((n) => !n.readAt).length)
  }, [])

  // Initial fetch + 60-second polling for unread badge
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClick)
    return () => document.removeEventListener("mousedown", handleClick)
  }, [open])

  async function handleOpen() {
    setOpen((prev) => !prev)
    if (!open && unreadCount > 0) {
      // Optimistically clear badge
      setUnreadCount(0)
      setItems((prev) => prev.map((n) => ({ ...n, readAt: n.readAt ?? new Date().toISOString() })))
      await fetch("/api/notifications/mark-read", { method: "PATCH" })
    }
  }

  function handleItemClick(panelId: string) {
    setOpen(false)
    router.push(`/panels/${panelId}`)
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell button */}
      <button
        onClick={handleOpen}
        aria-label="Notifications"
        className="relative flex items-center justify-center w-8 h-8 rounded-lg text-gray-500 hover:text-gray-700 hover:bg-gray-100 transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M14.857 17.082a23.848 23.848 0 005.454-1.31A8.967 8.967 0 0118 9.75v-.7V9A6 6 0 006 9v.75a8.967 8.967 0 01-2.312 6.022c1.733.64 3.56 1.085 5.455 1.31m5.714 0a24.255 24.255 0 01-5.714 0m5.714 0a3 3 0 11-5.714 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-4 px-0.5 rounded-full bg-red-500 text-white text-[10px] font-bold leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-100 z-50 flex flex-col max-h-[420px]">
          <div className="px-4 py-3 border-b border-gray-100 shrink-0">
            <p className="text-sm font-semibold text-gray-900">Notifications</p>
          </div>

          <ul className="flex-1 overflow-y-auto divide-y divide-gray-50">
            {items.length === 0 ? (
              <li className="px-4 py-6 text-sm text-gray-400 text-center">No notifications yet</li>
            ) : (
              items.map((n) => (
                <li key={n.id}>
                  <button
                    onClick={() => handleItemClick(n.panel.id)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors"
                  >
                    <p className="text-sm text-gray-800 leading-snug">
                      <span className="font-medium">{n.sender.name ?? "Someone"}</span>
                      {" flagged "}
                      <span className="font-medium">Panel {n.panel.panelIdentifier}</span>
                      {" for your attention"}
                    </p>
                    {n.message && (
                      <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">{n.message}</p>
                    )}
                    <p className="text-xs text-gray-400 mt-1">{timeAgo(n.createdAt)}</p>
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </div>
  )
}
