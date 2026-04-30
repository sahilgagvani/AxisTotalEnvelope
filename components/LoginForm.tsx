"use client"

import { useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter, useSearchParams } from "next/navigation"
import Image from "next/image"

type Mode = "select" | "quick-pin" | "credentials"

const ROLES = [
  { label: "Admin",     username: "admin"     },
  { label: "Inspector", username: "inspector" },
  { label: "Engineer",  username: "engineer"  },
]

export default function LoginForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = searchParams.get("callbackUrl") ?? "/dashboard"

  const [mode, setMode]               = useState<Mode>("select")
  const [selectedRole, setSelectedRole] = useState<typeof ROLES[number] | null>(null)
  const [username, setUsername]       = useState("")
  const [pin, setPin]                 = useState("")
  const [error, setError]             = useState<string | null>(null)
  const [loading, setLoading]         = useState(false)

  function reset() {
    setMode("select")
    setSelectedRole(null)
    setUsername("")
    setPin("")
    setError(null)
  }

  function pickRole(role: typeof ROLES[number]) {
    setSelectedRole(role)
    setPin("")
    setError(null)
    setMode("quick-pin")
  }

  function openCredentials() {
    setSelectedRole(null)
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
      setError("Invalid PIN.")
      return
    }

    router.push(callbackUrl)
    router.refresh()
  }

  function handlePinKeyDown(e: React.KeyboardEvent<HTMLInputElement>, usernameValue: string) {
    if (e.key === "Enter" && !loading) submit(usernameValue)
  }

  return (
    <main className="flex-1 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/axis-logo-light-transparent.png"
            alt="AXIS Total Envelope"
            width={140}
            height={40}
            priority
            style={{ width: "140px", height: "auto" }}
          />
        </div>

        <div className="bg-white rounded-2xl shadow-md px-6 py-8 sm:px-8">

          {/* ── Role selection ── */}
          {mode === "select" && (
            <>
              <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h1>
              <p className="text-sm text-gray-500 mb-6">Select your role to continue</p>

              <div className="flex flex-col gap-3">
                {ROLES.map((role) => (
                  <button
                    key={role.username}
                    onClick={() => pickRole(role)}
                    className="w-full rounded-lg border border-gray-200 bg-gray-50 px-4 py-3.5 text-base font-medium text-gray-800 hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-colors min-h-[52px] text-left"
                  >
                    {role.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-3 my-5">
                <div className="flex-1 h-px bg-gray-200" />
                <span className="text-xs text-gray-400">or</span>
                <div className="flex-1 h-px bg-gray-200" />
              </div>

              <button
                onClick={openCredentials}
                className="w-full rounded-lg border border-gray-300 px-4 py-3 text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors min-h-[48px]"
              >
                Sign in with username & PIN
              </button>
            </>
          )}

          {/* ── Quick PIN entry ── */}
          {mode === "quick-pin" && selectedRole && (
            <>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 -ml-1"
              >
                <span>←</span> Back
              </button>

              <h1 className="text-xl font-semibold text-gray-900 mb-1">
                Sign in as {selectedRole.label}
              </h1>
              <p className="text-sm text-gray-500 mb-6">Enter your 4-digit PIN</p>

              <div className="space-y-4">
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="\d{4}"
                  maxLength={4}
                  autoComplete="current-password"
                  autoFocus
                  placeholder="PIN"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                  onKeyDown={(e) => handlePinKeyDown(e, selectedRole.username)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base tracking-widest focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                />

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  onClick={() => submit(selectedRole.username)}
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[48px]"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </div>
            </>
          )}

          {/* ── Credential login ── */}
          {mode === "credentials" && (
            <>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700 mb-5 -ml-1"
              >
                <span>←</span> Back
              </button>

              <h1 className="text-xl font-semibold text-gray-900 mb-1">Sign in</h1>
              <p className="text-sm text-gray-500 mb-6">Enter your username and PIN</p>

              <div className="space-y-4">
                <div>
                  <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                    Username
                  </label>
                  <input
                    id="username"
                    type="text"
                    autoComplete="username"
                    autoFocus
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") document.getElementById("pin")?.focus() }}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                  />
                </div>

                <div>
                  <label htmlFor="pin" className="block text-sm font-medium text-gray-700 mb-1">
                    PIN
                  </label>
                  <input
                    id="pin"
                    type="password"
                    inputMode="numeric"
                    pattern="\d{4}"
                    maxLength={4}
                    autoComplete="current-password"
                    value={pin}
                    onChange={(e) => setPin(e.target.value.replace(/\D/g, "").slice(0, 4))}
                    onKeyDown={(e) => handlePinKeyDown(e, username)}
                    className="w-full rounded-lg border border-gray-300 px-3 py-3 text-base focus:outline-none focus:ring-2 focus:ring-blue-500 min-h-[48px]"
                  />
                </div>

                {error && <p className="text-sm text-red-600">{error}</p>}

                <button
                  onClick={() => submit(username)}
                  disabled={loading}
                  className="w-full rounded-lg bg-blue-600 px-4 py-3 text-base font-medium text-white hover:bg-blue-700 disabled:opacity-50 transition-colors min-h-[48px]"
                >
                  {loading ? "Signing in…" : "Sign in"}
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </main>
  )
}
