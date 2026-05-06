"use client"

import { useSession, signOut } from "next-auth/react"
import { usePathname } from "next/navigation"
import Image from "next/image"
import Link from "next/link"

export default function NavBar() {
  const { data: session } = useSession()
  const pathname = usePathname()

  // Hide on login page
  if (pathname === "/login") return null

  const name = session?.user?.name
  const role = session?.user?.role

  // First name only on mobile
  const firstName = name?.split(" ")[0] ?? ""
  const lastName = name && name !== firstName ? name.slice(firstName.length + 1) : ""

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center justify-between gap-2">

        {/* Left: logo (+ text on md+) */}
        <Link href="/dashboard" className="flex items-center gap-2 shrink-0 min-w-0">
          <Image
            src="/axis-logo-light-transparent.png"
            alt="AXIS Total Envelope"
            width={120}
            height={28}
            priority
            style={{ height: "28px", width: "auto" }}
          />
          <span className="hidden md:block text-sm font-semibold text-gray-900 whitespace-nowrap">
            Axis Total Envelope
          </span>
        </Link>

        {/* Right: user info + sign out */}
        <div className="flex items-center gap-1.5 sm:gap-3 shrink-0 min-w-0">
          {firstName && (
            <span className="text-sm text-gray-600 truncate max-w-[72px] sm:max-w-[120px]">
              <span className="sm:hidden">{firstName}</span>
              <span className="hidden sm:inline">{name}</span>
            </span>
          )}
          {role && (
            <span className="hidden sm:inline-flex items-center rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700 whitespace-nowrap">
              {role === "QC_INSPECTOR" ? "Inspector" : role === "ENGINEER" ? "Engineer" : "Admin"}
            </span>
          )}
          <button
            onClick={() => signOut({ callbackUrl: "/login" })}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors whitespace-nowrap py-1 px-2 -mr-2 min-h-[44px] flex items-center"
          >
            Sign out
          </button>
        </div>
      </div>
    </header>
  )
}
