import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import QrScanButton from "@/components/QrScanButton"
import PanelList from "./PanelList"

function AdminAction({
  href,
  icon,
  label,
  description,
  disabled,
}: {
  href: string
  icon: React.ReactNode
  label: string
  description: string
  disabled?: boolean
}) {
  const inner = (
    <div className={`flex items-center gap-3.5 rounded-xl border px-4 py-3.5 transition-colors ${
      disabled
        ? "border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed"
        : "border-gray-200 bg-white hover:bg-gray-50 active:bg-gray-100"
    }`}>
      <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-blue-50 text-blue-600 shrink-0">
        {icon}
      </span>
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-semibold text-gray-900">{label}</span>
        <span className="block text-xs text-gray-400 mt-0.5">{description}</span>
      </span>
      {!disabled && (
        <svg className="w-4 h-4 text-gray-300 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </div>
  )
  if (disabled) return inner
  return <Link href={href}>{inner}</Link>
}

export const metadata: Metadata = {
  title: "Panels — AXIS Total Envelope",
}


export default async function DashboardPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"
  const name    = session?.user?.name

  const panels = await prisma.panel.findMany({
    where: { archivedAt: null },
    orderBy: [{ floor: "asc" }, { panelIdentifier: "asc" }],
  })

  const total      = panels.length
  const completed  = panels.filter((p) => p.status === "COMPLETED").length
  const inProgress = panels.filter((p) => p.status === "IN_PROGRESS").length
  const notStarted = panels.filter((p) => p.status === "NOT_STARTED").length

  return (
    <main className="flex-1">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">

        {/* Page header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            {name ? (
              <>
                <p className="text-sm text-gray-500 mb-0.5">Welcome back</p>
                <h1 className="text-xl font-bold text-gray-900">{name}</h1>
              </>
            ) : (
              <h1 className="text-xl font-bold text-gray-900">Panels</h1>
            )}
          </div>
          {!isAdmin && <QrScanButton />}
        </div>

        {/* Admin actions */}
        {isAdmin && (
          <div className="flex flex-col gap-2 mb-6">
            <AdminAction
              href="/admin/users"
              label="User Management"
              description="Add, edit, or remove users"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M17 20h5v-2a4 4 0 00-4-4h-1M9 20H4v-2a4 4 0 014-4h1m4-4a4 4 0 100-8 4 4 0 000 8zm6 0a3 3 0 100-6 3 3 0 000 6zm-12 0a3 3 0 100-6 3 3 0 000 6z" />
                </svg>
              }
            />
            <AdminAction
              href="/admin/panels"
              label="Panel Management"
              description="Add, edit, or archive panels"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              }
            />
            <AdminAction
              href="/admin/qr"
              label="QR Management"
              description="Print QR codes for panels"
              icon={
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 9V5a2 2 0 012-2h4M3 15v4a2 2 0 002 2h4m10-14h4a2 2 0 012 2v4m0 6v4a2 2 0 01-2 2h-4M9 9h.01M15 9h.01M9 15h.01M15 15h.01" />
                </svg>
              }
            />
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          {[
            { label: "Total",       value: total,       style: "bg-white border border-gray-200 text-gray-800" },
            { label: "Not Started", value: notStarted,  style: "bg-gray-50 border border-gray-200 text-gray-600" },
            { label: "In Progress", value: inProgress,  style: "bg-blue-50 border border-blue-100 text-blue-700" },
            { label: "Completed",   value: completed,   style: "bg-green-50 border border-green-100 text-green-700" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-xl p-4 ${stat.style}`}>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        <PanelList panels={panels} />


      </div>
    </main>
  )
}
