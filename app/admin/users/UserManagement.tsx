"use client"

import { useState, useEffect, useRef } from "react"
import Link from "next/link"
import type { Role } from "@prisma/client"

type User = {
  id: string
  username: string
  name: string | null
  role: Role
  quickLogin: boolean
  deletedAt: string | null
  createdAt: string
}

type ModalMode = "create" | "edit" | "reset-pin" | "delete" | null

const ROLE_LABELS: Record<string, string> = {
  QC_INSPECTOR: "Inspector",
  ENGINEER: "Engineer",
}

const ROLE_COLORS: Record<string, string> = {
  QC_INSPECTOR: "bg-emerald-50 text-emerald-700",
  ENGINEER: "bg-violet-50 text-violet-700",
}

/* ── PIN dot input ─────────────────────────────────────────────────────────── */
import { forwardRef } from "react"

const PinInput = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; disabled?: boolean }
>(function PinInput({ value, onChange, disabled }, ref) {
  return (
    <div className="relative flex justify-center gap-3">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center transition-colors ${
            i < value.length
              ? "border-blue-500 bg-blue-50"
              : i === value.length
              ? "border-blue-400 bg-white shadow-sm"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          {i < value.length ? (
            <span className="w-2.5 h-2.5 rounded-full bg-blue-600 block" />
          ) : null}
        </div>
      ))}
      <input
        ref={ref}
        type="password"
        inputMode="numeric"
        maxLength={4}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, 4))}
        className="absolute inset-0 opacity-0 cursor-default w-full h-full"
        aria-label="Enter PIN"
      />
    </div>
  )
})

/* ── UserFormModal (create / edit) ─────────────────────────────────────────── */
function UserFormModal({
  mode,
  user,
  onClose,
  onSaved,
}: {
  mode: "create" | "edit"
  user: User | null
  onClose: () => void
  onSaved: (u: User) => void
}) {
  const [name, setName] = useState(user?.name ?? "")
  const [username, setUsername] = useState(user?.username ?? "")
  const [role, setRole] = useState<string>(user?.role ?? "QC_INSPECTOR")
  const [pin, setPin] = useState("")
  const [quickLogin, setQuickLogin] = useState(user?.quickLogin ?? false)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const pinRef = useRef<HTMLInputElement>(null)

  useEffect(() => { pinRef.current?.focus() }, [])

  async function save() {
    if (!name.trim()) return setError("Display name is required.")
    if (mode === "create") {
      if (!username.trim()) return setError("Username is required.")
      if (!/^\d{4}$/.test(pin)) return setError("PIN must be exactly 4 digits.")
    }
    setError(null)
    setSaving(true)

    const url = mode === "create" ? "/api/users" : `/api/users/${user!.id}`
    const method = mode === "create" ? "POST" : "PATCH"
    const body: Record<string, unknown> = { name, role, quickLogin }
    if (mode === "create") { body.username = username; body.pin = pin }

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) return setError(data.error ?? "Something went wrong.")
    onSaved(data)
  }

  return (
    <Overlay onClose={onClose}>
      <ModalCard title={mode === "create" ? "Add User" : "Edit User"} onClose={onClose}>
        <div className="space-y-4">
          <Field label="Display Name">
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className={inputCls}
              placeholder="e.g. Joanna Smith"
              autoFocus
            />
          </Field>

          {mode === "create" && (
            <Field label="Username">
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/\s/g, ""))}
                className={inputCls}
                placeholder="e.g. joanna"
                autoComplete="off"
              />
            </Field>
          )}

          <Field label="Role">
            <select
              value={role}
              onChange={(e) => setRole(e.target.value)}
              className={inputCls}
            >
              <option value="QC_INSPECTOR">Inspector</option>
              <option value="ENGINEER">Engineer</option>
            </select>
          </Field>

          {mode === "create" && (
            <Field label="PIN">
              <PinInput ref={pinRef} value={pin} onChange={setPin} />
            </Field>
          )}

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <div
              onClick={() => setQuickLogin((v) => !v)}
              className={`relative w-10 h-6 rounded-full transition-colors ${quickLogin ? "bg-blue-600" : "bg-gray-200"}`}
            >
              <span
                className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${quickLogin ? "translate-x-4" : ""}`}
              />
            </div>
            <span className="text-sm text-gray-700">Show on quick-login screen</span>
          </label>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors min-h-[48px]"
          >
            {saving ? "Saving…" : mode === "create" ? "Add User" : "Save Changes"}
          </button>
        </div>
      </ModalCard>
    </Overlay>
  )
}

/* ── ResetPinModal ─────────────────────────────────────────────────────────── */
function ResetPinModal({
  user,
  onClose,
  onSaved,
}: {
  user: User
  onClose: () => void
  onSaved: (u: User) => void
}) {
  const [pin, setPin] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const pinRef = useRef<HTMLInputElement>(null)

  useEffect(() => { pinRef.current?.focus() }, [])

  async function save() {
    if (!/^\d{4}$/.test(pin)) return setError("PIN must be exactly 4 digits.")
    setError(null)
    setSaving(true)

    const res = await fetch(`/api/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pin }),
    })
    const data = await res.json()
    setSaving(false)

    if (!res.ok) return setError(data.error ?? "Something went wrong.")
    onSaved(data)
  }

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Reset PIN" onClose={onClose}>
        <p className="text-sm text-gray-500 mb-4">
          Setting a new PIN for <span className="font-medium text-gray-800">{user.name ?? user.username}</span>.
        </p>
        <div className="space-y-4">
          <Field label="New PIN">
            <PinInput ref={pinRef} value={pin} onChange={setPin} />
          </Field>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <button
            onClick={save}
            disabled={saving}
            className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors min-h-[48px]"
          >
            {saving ? "Saving…" : "Set New PIN"}
          </button>
        </div>
      </ModalCard>
    </Overlay>
  )
}

/* ── DeleteModal ───────────────────────────────────────────────────────────── */
function DeleteModal({
  user,
  onClose,
  onDeleted,
}: {
  user: User
  onClose: () => void
  onDeleted: (id: string, hard: boolean) => void
}) {
  const [mode, setMode] = useState<"choose" | "confirm-hard">("choose")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function doDelete(hard: boolean) {
    setDeleting(true)
    setError(null)
    const res = await fetch(`/api/users/${user.id}?hard=${hard}`, { method: "DELETE" })
    setDeleting(false)
    if (!res.ok) {
      const d = await res.json()
      return setError(d.error ?? "Something went wrong.")
    }
    onDeleted(user.id, hard)
  }

  return (
    <Overlay onClose={onClose}>
      <ModalCard title="Remove User" onClose={onClose}>
        <p className="text-sm text-gray-600 mb-5">
          What would you like to do with{" "}
          <span className="font-medium text-gray-900">{user.name ?? user.username}</span>?
        </p>

        {mode === "choose" && (
          <div className="space-y-3">
            <button
              onClick={() => doDelete(false)}
              disabled={deleting}
              className="w-full rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-40 transition-colors min-h-[48px] text-left"
            >
              <span className="block font-semibold text-gray-900">Deactivate</span>
              <span className="block text-xs text-gray-400 mt-0.5">
                User is hidden but their inspection history is preserved.
              </span>
            </button>
            <button
              onClick={() => setMode("confirm-hard")}
              className="w-full rounded-xl border border-red-200 px-4 py-3 text-sm font-medium text-red-600 hover:bg-red-50 transition-colors min-h-[48px] text-left"
            >
              <span className="block font-semibold">Permanently Delete</span>
              <span className="block text-xs text-red-400 mt-0.5">
                Removes the user and all associated records. This cannot be undone.
              </span>
            </button>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}

        {mode === "confirm-hard" && (
          <div className="space-y-4">
            <div className="rounded-xl bg-red-50 border border-red-200 px-4 py-3">
              <p className="text-sm font-semibold text-red-700">Warning: Permanent deletion</p>
              <p className="text-xs text-red-600 mt-1">
                This will permanently delete <strong>{user.name ?? user.username}</strong> and all their inspection records, photos, and audit logs. This action cannot be undone.
              </p>
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMode("choose")}
                className="flex-1 rounded-xl border border-gray-200 px-4 py-3 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors min-h-[48px]"
              >
                Cancel
              </button>
              <button
                onClick={() => doDelete(true)}
                disabled={deleting}
                className="flex-1 rounded-xl bg-red-600 px-4 py-3 text-sm font-semibold text-white hover:bg-red-700 disabled:opacity-40 transition-colors min-h-[48px]"
              >
                {deleting ? "Deleting…" : "Yes, Delete"}
              </button>
            </div>
            {error && <p className="text-sm text-red-500">{error}</p>}
          </div>
        )}
      </ModalCard>
    </Overlay>
  )
}

/* ── UserRow ───────────────────────────────────────────────────────────────── */
function UserRow({
  user,
  onEdit,
  onResetPin,
  onDelete,
  onReactivate,
}: {
  user: User
  onEdit: () => void
  onResetPin: () => void
  onDelete: () => void
  onReactivate: () => void
}) {
  const isDeactivated = !!user.deletedAt
  const initials = (user.name ?? user.username).slice(0, 2).toUpperCase()

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 min-h-[64px] ${isDeactivated ? "opacity-50" : ""}`}>
      {/* Avatar */}
      <span className={`flex items-center justify-center w-9 h-9 rounded-full text-xs font-bold shrink-0 ${
        user.role === "ENGINEER" ? "bg-violet-100 text-violet-700" : "bg-emerald-100 text-emerald-700"
      }`}>
        {initials}
      </span>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-semibold text-gray-900 truncate">
            {user.name ?? user.username}
          </span>
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_COLORS[user.role]}`}>
            {ROLE_LABELS[user.role]}
          </span>
          {isDeactivated && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-gray-100 text-gray-500">
              Deactivated
            </span>
          )}
          {user.quickLogin && !isDeactivated && (
            <span className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-blue-50 text-blue-600">
              Quick Login
            </span>
          )}
        </div>
        <span className="block text-xs text-gray-400 mt-0.5">@{user.username}</span>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {isDeactivated ? (
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
              aria-label="Edit user"
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 012.828 0l.172.172a2 2 0 010 2.828L12 15H9v-3z" />
              </svg>
            </button>
            <button
              onClick={onResetPin}
              aria-label="Reset PIN"
              className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors min-h-[44px] min-w-[44px]"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
              </svg>
            </button>
          </>
        )}
        <button
          onClick={onDelete}
          aria-label="Remove user"
          className="flex items-center justify-center w-9 h-9 rounded-lg hover:bg-red-50 text-gray-300 hover:text-red-500 transition-colors min-h-[44px] min-w-[44px]"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  )
}

/* ── Main component ────────────────────────────────────────────────────────── */
export default function UserManagement() {
  const [users, setUsers] = useState<User[]>([])
  const [loading, setLoading] = useState(true)
  const [showDeactivated, setShowDeactivated] = useState(false)

  const [modalMode, setModalMode] = useState<ModalMode>(null)
  const [activeUser, setActiveUser] = useState<User | null>(null)

  useEffect(() => {
    fetch("/api/users")
      .then((r) => r.json())
      .then((data) => { setUsers(data); setLoading(false) })
  }, [])

  function openCreate() { setActiveUser(null); setModalMode("create") }
  function openEdit(u: User) { setActiveUser(u); setModalMode("edit") }
  function openResetPin(u: User) { setActiveUser(u); setModalMode("reset-pin") }
  function openDelete(u: User) { setActiveUser(u); setModalMode("delete") }
  function closeModal() { setModalMode(null); setActiveUser(null) }

  function onSaved(updated: User) {
    setUsers((prev) => {
      const idx = prev.findIndex((u) => u.id === updated.id)
      if (idx >= 0) {
        const next = [...prev]
        next[idx] = updated
        return next
      }
      return [...prev, updated]
    })
    closeModal()
  }

  function onDeleted(id: string, hard: boolean) {
    if (hard) {
      setUsers((prev) => prev.filter((u) => u.id !== id))
    } else {
      setUsers((prev) =>
        prev.map((u) => u.id === id ? { ...u, deletedAt: new Date().toISOString() } : u)
      )
    }
    closeModal()
  }

  async function reactivate(u: User) {
    const res = await fetch(`/api/users/${u.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reactivate: true }),
    })
    if (res.ok) {
      const updated = await res.json()
      onSaved(updated)
    }
  }

  const active = users.filter((u) => !u.deletedAt)
  const deactivated = users.filter((u) => !!u.deletedAt)
  const visible = showDeactivated ? users : active

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
            <h1 className="text-xl font-bold text-gray-900">User Management</h1>
            <p className="text-sm text-gray-400 mt-0.5">{active.length} active user{active.length !== 1 ? "s" : ""}</p>
          </div>
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-700 transition-colors min-h-[44px] shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
            Add User
          </button>
        </div>

        {/* User list */}
        {loading ? (
          <div className="flex justify-center py-12">
            <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden divide-y divide-gray-100">
              {visible.length === 0 ? (
                <p className="text-sm text-gray-400 px-4 py-8 text-center">No users yet. Add one above.</p>
              ) : (
                visible.map((u) => (
                  <UserRow
                    key={u.id}
                    user={u}
                    onEdit={() => openEdit(u)}
                    onResetPin={() => openResetPin(u)}
                    onDelete={() => openDelete(u)}
                    onReactivate={() => reactivate(u)}
                  />
                ))
              )}
            </div>

            {deactivated.length > 0 && (
              <button
                onClick={() => setShowDeactivated((v) => !v)}
                className="mt-4 w-full text-sm text-gray-400 hover:text-gray-600 transition-colors py-2"
              >
                {showDeactivated
                  ? `Hide ${deactivated.length} deactivated user${deactivated.length !== 1 ? "s" : ""}`
                  : `Show ${deactivated.length} deactivated user${deactivated.length !== 1 ? "s" : ""}`}
              </button>
            )}
          </>
        )}
      </div>

      {/* Modals */}
      {(modalMode === "create" || modalMode === "edit") && (
        <UserFormModal
          mode={modalMode}
          user={activeUser}
          onClose={closeModal}
          onSaved={onSaved}
        />
      )}
      {modalMode === "reset-pin" && activeUser && (
        <ResetPinModal user={activeUser} onClose={closeModal} onSaved={onSaved} />
      )}
      {modalMode === "delete" && activeUser && (
        <DeleteModal user={activeUser} onClose={closeModal} onDeleted={onDeleted} />
      )}
    </main>
  )
}

/* ── Shared UI primitives ──────────────────────────────────────────────────── */
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
