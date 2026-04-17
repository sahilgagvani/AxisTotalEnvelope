import Image from "next/image"
import Link from "next/link"

export default function NotFoundPage() {
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
      <h1 className="text-xl font-bold text-gray-900 mb-2">Page not found</h1>
      <p className="text-sm text-gray-500 mb-8 max-w-xs">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-gray-900 text-white rounded-xl text-sm font-medium hover:bg-gray-700 transition-colors min-h-[48px] inline-flex items-center"
      >
        Back to Dashboard
      </Link>
    </main>
  )
}
