"use client"

import { useState, useRef, useEffect, forwardRef } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"

type Mode = "select" | "quick-pin" | "credentials"

type QuickUser = {
  id: string
  username: string
  name: string | null
  role: string
}

const ROLE_COLORS: Record<string, { color: string; ring: string }> = {
  ADMIN:        { color: "bg-blue-100 text-blue-700",    ring: "ring-blue-200" },
  QC_INSPECTOR: { color: "bg-emerald-100 text-emerald-700", ring: "ring-emerald-200" },
  ENGINEER:     { color: "bg-violet-100 text-violet-700",  ring: "ring-violet-200" },
}

const ROLE_LABELS: Record<string, string> = {
  ADMIN:        "Admin",
  QC_INSPECTOR: "Inspector",
  ENGINEER:     "Engineer",
}

const ROLE_DESC: Record<string, string> = {
  ADMIN:        "Full system access",
  QC_INSPECTOR: "QC inspection workflow",
  ENGINEER:     "Engineering view",
}

const ADMIN_TILE: QuickUser = {
  id: "__admin__",
  username: "admin",
  name: "Admin",
  role: "ADMIN",
}

function initials(name: string | null, username: string) {
  const display = name ?? username
  const parts = display.trim().split(/\s+/)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return display.slice(0, 2).toUpperCase()
}

export default function LoginForm() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl  = searchParams.get("callbackUrl") ?? "/dashboard"

  const [tiles, setTiles]                 = useState<QuickUser[]>([ADMIN_TILE])
  const [mode, setMode]                   = useState<Mode>("select")
  const [selectedUser, setSelectedUser]   = useState<QuickUser | null>(null)
  const [username, setUsername]           = useState("")
  const [pin, setPin]                     = useState("")
  const [error, setError]                 = useState<string | null>(null)
  const [loading, setLoading]             = useState(false)

  const pinRef      = useRef<HTMLInputElement>(null)
  const usernameRef = useRef<HTMLInputElement>(null)

  // Load dynamic quick-login users, always prepend admin tile
  useEffect(() => {
    fetch("/api/users/quick-login")
      .then((r) => r.json())
      .then((data: QuickUser[]) => setTiles([ADMIN_TILE, ...data]))
      .catch(() => {}) // keep admin tile on error
  }, [])

  useEffect(() => {
    if (mode === "quick-pin") pinRef.current?.focus()
    if (mode === "credentials") usernameRef.current?.focus()
  }, [mode])

  function reset() {
    setMode("select")
    setSelectedUser(null)
    setUsername("")
    setPin("")
    setError(null)
  }

  function pickUser(user: QuickUser) {
    setSelectedUser(user)
    setPin("")
    setError(null)
    setMode("quick-pin")
  }

  function openCredentials() {
    setSelectedUser(null)
    setUsername("")
    setPin("")
    setError(null)
    setMode("credentials")
  }

  async function submit(usernameValue: string) {
    if (!/^\d{4}$/.test(pin)) {
      setError("PIN must be exactly 4 digits.")
      return
    }
    setError(null)
    setLoading(true)

    const result = await signIn("credentials", {
      username: usernameValue,
      pin,
      redirect: false,
    })

    setLoading(false)

    if (result?.error) {
      setError("Incorrect PIN. Try again.")
      setPin("")
      pinRef.current?.focus()
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  function onPinKeyDown(e: React.KeyboardEvent, usernameValue: string) {
    if (e.key === "Enter" && !loading) submit(usernameValue)
  }

  const { color, ring } = selectedUser
    ? (ROLE_COLORS[selectedUser.role] ?? ROLE_COLORS.QC_INSPECTOR)
    : { color: "", ring: "" }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10 bg-gradient-to-br from-slate-50 via-white to-blue-50/40">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/axis-logo-light-transparent.png"
            alt="AXIS Total Envelope"
            width={148}
            height={40}
            priority
            style={{ width: "148px", height: "auto" }}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">

          {/* ── Role selection ── */}
          {mode === "select" && (
            <>
              <div className="px-6 pt-7 pb-5 border-b border-gray-100">
                <h1 className="text-lg font-semibold text-gray-900">Sign in</h1>
                <p className="text-sm text-gray-400 mt-0.5">Choose your account to get started</p>
              </div>

              <div className="px-4 py-4 flex flex-col gap-2">
                {tiles.map((user) => {
                  const c = ROLE_COLORS[user.role] ?? ROLE_COLORS.QC_INSPECTOR
                  return (
                    <button
                      key={user.id}
                      onClick={() => pickUser(user)}
                      className="group flex items-center gap-3.5 w-full rounded-xl px-3.5 py-3 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors"
                    >
                      <span className={`flex items-center justify-center w-10 h-10 rounded-full text-sm font-semibold ring-1 shrink-0 ${c.color} ${c.ring}`}>
                        {initials(user.name, user.username)}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="block text-sm font-semibold text-gray-800 group-hover:text-gray-900 truncate">
                          {user.name ?? user.username}
                        </span>
                        <span className="block text-xs text-gray-400 mt-0.5">
                          {ROLE_DESC[user.role] ?? ROLE_LABELS[user.role]}
                        </span>
                      </span>
                      <svg className="w-4 h-4 text-gray-300 group-hover:text-gray-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </button>
                  )
                })}
              </div>

              <div className="px-6 pb-6">
                <div className="flex items-center gap-3 my-3">
                  <div className="flex-1 h-px bg-gray-100" />
                  <span className="text-xs text-gray-300">or</span>
                  <div className="flex-1 h-px bg-gray-100" />
                </div>
                <button
                  onClick={openCredentials}
                  className="w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors"
                >
                  Sign in with username & PIN
                </button>
              </div>
            </>
          )}

          {/* ── Quick PIN entry ── */}
          {mode === "quick-pin" && selectedUser && (
            <>
              <div className="px-6 pt-6 pb-5 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={reset}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                  aria-label="Back"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 leading-tight">
                    {selectedUser.name ?? selectedUser.username}
                  </h1>
                  <p className="text-sm text-gray-400">Enter your PIN to continue</p>
                </div>
              </div>

              <div className="px-6 py-6 space-y-4">
                <div className="flex justify-center">
                  <span className={`flex items-center justify-center w-14 h-14 rounded-full text-xl font-bold ring-2 ${color} ${ring}`}>
                    {initials(selectedUser.name, selectedUser.username)}
                  </span>
                </div>

                <PinInput
                  ref={pinRef}
                  value={pin}
                  onChange={(v) => { setPin(v); setError(null) }}
                  onEnter={() => submit(selectedUser.username)}
                  disabled={loading}
                />

                {error && (
                  <p className="text-sm text-red-500 text-center">{error}</p>
                )}

                <button
                  onClick={() => submit(selectedUser.username)}
                  disabled={loading || pin.length !== 4}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors min-h-[48px]"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </div>
            </>
          )}

          {/* ── Credential login ── */}
          {mode === "credentials" && (
            <>
              <div className="px-6 pt-6 pb-5 border-b border-gray-100 flex items-center gap-3">
                <button
                  onClick={reset}
                  className="flex items-center justify-center w-8 h-8 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-600 transition-colors shrink-0"
                  aria-label="Back"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <div>
                  <h1 className="text-lg font-semibold text-gray-900 leading-tight">Sign in</h1>
                  <p className="text-sm text-gray-400">Username & PIN</p>
                </div>
              </div>

              <div className="px-6 py-6 space-y-4">
                <div>
                  <label htmlFor="username" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    Username
                  </label>
                  <input
                    ref={usernameRef}
                    id="username"
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") pinRef.current?.focus() }}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 placeholder:text-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition min-h-[48px]"
                    placeholder="e.g. admin"
                  />
                </div>

                <div>
                  <label htmlFor="pin-creds" className="block text-xs font-medium text-gray-500 mb-1.5 uppercase tracking-wide">
                    PIN
                  </label>
                  <input
                    ref={pinRef}
                    id="pin-creds"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    autoComplete="current-password"
                    value={pin}
                    onChange={(e) => { setPin(e.target.value.replace(/\D/g, "").slice(0, 4)); setError(null) }}
                    onKeyDown={(e) => onPinKeyDown(e, username)}
                    className="w-full rounded-xl border border-gray-200 px-3.5 py-3 text-sm text-gray-900 tracking-[0.4em] focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition min-h-[48px]"
                    placeholder="••••"
                  />
                </div>

                {error && <p className="text-sm text-red-500">{error}</p>}

                <button
                  onClick={() => submit(username)}
                  disabled={loading}
                  className="w-full rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-40 transition-colors min-h-[48px]"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </div>
            </>
          )}

        </div>

        <p className="text-center text-xs text-gray-400 mt-6">AXIS Total Envelope © 2026</p>
      </div>
    </main>
  )
}

/* ── PIN dot input ──────────────────────────────────────────────────────────── */
const PinInput = forwardRef<
  HTMLInputElement,
  { value: string; onChange: (v: string) => void; onEnter: () => void; disabled: boolean }
>(function PinInput({ value, onChange, onEnter, disabled }, ref) {
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
        onKeyDown={(e) => { if (e.key === "Enter") onEnter() }}
        className="absolute inset-0 opacity-0 cursor-default w-full h-full"
        aria-label="Enter PIN"
      />
    </div>
  )
})
