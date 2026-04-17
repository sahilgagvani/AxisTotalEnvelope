"use client"

import Image from "next/image"
import Link from "next/link"

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
      <Image
        src="/axis-logo-light-transparent.png"
        alt="AXIS Total Envelope"
        width={140}
        height={40}
        style={{ width: "140px", height: "auto" }}
        className="mb-8 opacity-80"
      />
      <h1 className="text-xl font-bold text-gray-900 mb-2">Something went wrong</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-xs">
        {error.message || "An unexpected error occurred. Please try again."}
      </p>
      <div className="flex flex-col sm:flex-row gap-3">
        <button
          onClick={reset}
          className="px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors min-h-[48px]"
        >
          Try again
        </button>
        <Link
          href="/dashboard"
          className="px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl text-sm font-medium hover:border-gray-300 transition-colors min-h-[48px] flex items-center justify-center"
        >
          Back to Dashboard
        </Link>
      </div>
    </main>
  )
}
