import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import Link from "next/link"
import QrScanButton from "@/components/QrScanButton"
import { PanelStatus, AssemblyType } from "@prisma/client"

export const metadata: Metadata = {
  title: "Panels — AXIS Total Envelope",
}

function StatusBadge({ status }: { status: PanelStatus }) {
  const styles: Record<PanelStatus, string> = {
    NOT_STARTED: "bg-gray-100 text-gray-600",
    IN_PROGRESS:  "bg-blue-50 text-blue-700",
    COMPLETED:    "bg-green-50 text-green-700",
  }
  const labels: Record<PanelStatus, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS:  "In Progress",
    COMPLETED:    "Completed",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  )
}

function AssemblyBadge({ type }: { type: AssemblyType | null }) {
  if (!type) return <span className="text-gray-400 text-xs">—</span>
  const styles: Record<AssemblyType, string> = {
    EPS: "bg-amber-50 text-amber-700",
    FRR: "bg-purple-50 text-purple-700",
  }
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${styles[type]}`}>
      {type}
    </span>
  )
}

export default async function DashboardPage() {
  const session = await auth()
  const isAdmin = session?.user?.role === "ADMIN"
  const name    = session?.user?.name

  const panels = await prisma.panel.findMany({
    orderBy: [{ elevation: "asc" }, { panelIdentifier: "asc" }],
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

        {panels.length === 0 ? (
          <p className="text-gray-500 text-sm">No panels yet.</p>
        ) : (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">

            {/* Mobile card list (below md) */}
            <div className="md:hidden divide-y divide-gray-100">
              {panels.map((panel) => (
                <Link
                  key={panel.id}
                  href={`/panels/${panel.id}`}
                  className="flex items-start justify-between gap-3 px-4 py-4 hover:bg-gray-50 active:bg-gray-100 min-h-[64px]"
                >
                  <div className="min-w-0">
                    <div className="font-medium text-gray-900 text-sm mb-1.5">
                      {panel.panelIdentifier}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <AssemblyBadge type={panel.assemblyType} />
                      {panel.location && (
                        <span className="text-xs text-gray-500">{panel.location}</span>
                      )}
                    </div>
                  </div>
                  <div className="shrink-0 pt-0.5">
                    <StatusBadge status={panel.status} />
                  </div>
                </Link>
              ))}
            </div>

            {/* Desktop table (md+) */}
            <div className="hidden md:block overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {["Panel ID", "Assembly", "Dimensions", "Location", "Elevation", "Status"].map((h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {panels.map((panel) => (
                    <tr key={panel.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <Link
                          href={`/panels/${panel.id}`}
                          className="font-medium text-gray-900 hover:text-blue-600"
                        >
                          {panel.panelIdentifier}
                        </Link>
                      </td>
                      <td className="px-4 py-3">
                        <AssemblyBadge type={panel.assemblyType} />
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                        {panel.dimensions ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {panel.location ?? "—"}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-600">
                        {panel.elevation ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={panel.status} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

          </div>
        )}


      </div>
    </main>
  )
}
