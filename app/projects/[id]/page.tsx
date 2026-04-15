import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import NavBar from "@/components/NavBar"
import { PanelStatus, AssemblyType } from "@prisma/client"

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
  if (!type) return <span className="text-gray-400 text-sm">—</span>
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

export default async function ProjectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const session = await auth()
  const userId = session?.user?.id
  const role = session?.user?.role

  const project = await prisma.project.findUnique({
    where: { id },
    include: {
      panels: {
        orderBy: [{ elevation: "asc" }, { panelIdentifier: "asc" }],
      },
    },
  })

  if (!project) notFound()

  // QC Inspectors can only view projects they are assigned to
  if (role !== "ADMIN") {
    const assignment = await prisma.projectAssignment.findUnique({
      where: { userId_projectId: { userId: userId!, projectId: project.id } },
    })
    if (!assignment) {
      return (
        <main className="min-h-screen bg-gray-50">
          <NavBar name={session?.user?.name} role={role} />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">
              Not authorized
            </h1>
            <p className="text-gray-500 mb-6">
              You are not assigned to this project.
            </p>
            <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
              ← Back to dashboard
            </Link>
          </div>
        </main>
      )
    }
  }

  const total = project.panels.length
  const completed  = project.panels.filter((p) => p.status === "COMPLETED").length
  const inProgress = project.panels.filter((p) => p.status === "IN_PROGRESS").length
  const notStarted = project.panels.filter((p) => p.status === "NOT_STARTED").length

  return (
    <main className="min-h-screen bg-gray-50">
      <NavBar name={session?.user?.name} role={role} />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        {/* Breadcrumb */}
        <Link
          href="/dashboard"
          className="text-sm text-gray-500 hover:text-gray-700 mb-6 inline-block"
        >
          ← Back to Projects
        </Link>

        {/* Project header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            {project.name}
          </h1>
          <div className="flex flex-col gap-0.5 text-sm text-gray-600">
            {project.clientName && <span>{project.clientName}</span>}
            {project.address    && <span>{project.address}</span>}
            {project.description && (
              <span className="text-gray-400 mt-1">{project.description}</span>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {[
            { label: "Total",       value: total,       style: "bg-white border border-gray-200 text-gray-800" },
            { label: "Not Started", value: notStarted,  style: "bg-gray-50 border border-gray-200 text-gray-600" },
            { label: "In Progress", value: inProgress,  style: "bg-blue-50 border border-blue-100 text-blue-700" },
            { label: "Completed",   value: completed,   style: "bg-green-50 border border-green-100 text-green-700" },
          ].map((stat) => (
            <div key={stat.label} className={`rounded-lg p-4 ${stat.style}`}>
              <div className="text-2xl font-bold">{stat.value}</div>
              <div className="text-xs font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Panel table */}
        <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  {["Panel ID", "Assembly", "Dimensions", "Location", "Elevation", "Status"].map(
                    (h) => (
                      <th
                        key={h}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap"
                      >
                        {h}
                      </th>
                    )
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {project.panels.map((panel) => (
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
      </div>
    </main>
  )
}
