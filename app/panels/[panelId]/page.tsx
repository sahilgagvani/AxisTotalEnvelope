import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import ChecklistSection from "@/components/ChecklistSection"
import ActivityLog from "@/components/ActivityLog"
import { PanelStatus, AssemblyType } from "@prisma/client"

export async function generateMetadata({
  params,
}: {
  params: Promise<{ panelId: string }>
}): Promise<Metadata> {
  const { panelId } = await params
  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
    select: { panelIdentifier: true },
  })
  return {
    title: panel
      ? `Panel ${panel.panelIdentifier} — AXIS Total Envelope`
      : "Panel — AXIS Total Envelope",
  }
}

// ── Badges ───────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: PanelStatus }) {
  const styles: Record<PanelStatus, string> = {
    NOT_STARTED: "bg-gray-100 text-gray-600",
    IN_PROGRESS: "bg-blue-50 text-blue-700",
    COMPLETED:   "bg-green-50 text-green-700",
  }
  const labels: Record<PanelStatus, string> = {
    NOT_STARTED: "Not Started",
    IN_PROGRESS: "In Progress",
    COMPLETED:   "Completed",
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

const assemblyFullName: Record<AssemblyType, string> = {
  EPS: "StoTherm ci (EPS)",
  FRR: "StoTherm ci Mineral (FRR)",
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default async function PanelDetailPage({
  params,
}: {
  params: Promise<{ panelId: string }>
}) {
  const { panelId } = await params
  const session = await auth()
  const userId  = session?.user?.id
  const role    = session?.user?.role
  const isInspector = role === "QC_INSPECTOR"

  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
    include: {
      project: true,
      inspectionRecords: {
        include: {
          step:      true,
          inspector: true,
          photos:    true,
          auditLogs: {
            include:  { user: true },
            orderBy:  { timestamp: "desc" },
          },
        },
      },
    },
  })

  if (!panel) notFound()

  if (role !== "ADMIN") {
    const assignment = await prisma.projectAssignment.findUnique({
      where: {
        userId_projectId: { userId: userId!, projectId: panel.projectId },
      },
    })
    if (!assignment) {
      return (
        <main className="flex-1">
          <div className="max-w-2xl mx-auto px-4 py-16 text-center">
            <h1 className="text-xl font-semibold text-gray-900 mb-2">Not authorized</h1>
            <p className="text-gray-500 mb-6">You are not assigned to this project.</p>
            <Link href="/dashboard" className="text-blue-600 hover:underline text-sm">
              ← Back to dashboard
            </Link>
          </div>
        </main>
      )
    }
  }

  const steps = await prisma.inspectionStep.findMany({
    orderBy: { stepOrder: "asc" },
  })

  const recordCount = panel.inspectionRecords.length
  const totalSteps  = steps.length
  const showStickyInspect = isInspector && recordCount < totalSteps

  const serializedRecords = panel.inspectionRecords.map((r) => ({
    id:            r.id,
    stepId:        r.stepId,
    result:        r.result as "PASS" | "FAIL" | "NA",
    notes:         r.notes,
    completedAt:   r.completedAt.toISOString(),
    inspectorName: r.inspector.name ?? "Unknown",
    photos:        r.photos.map((p) => ({ id: p.id, url: p.url })),
  }))

  const allAuditLogs = panel.inspectionRecords
    .flatMap((r) =>
      r.auditLogs.map((log) => ({ ...log, stepName: r.step.name }))
    )
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  const serializedLogs = allAuditLogs.slice(0, 50).map((log) => ({
    id:             log.id,
    action:         log.action,
    userName:       log.user.name ?? "Unknown",
    stepName:       log.stepName,
    timestamp:      log.timestamp.toISOString(),
    previousResult: log.previousResult,
    newResult:      log.newResult,
    previousNotes:  log.previousNotes,
    newNotes:       log.newNotes,
  }))

  return (
    <>
      <main className={`flex-1 ${showStickyInspect ? "pb-28" : ""}`}>
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">

          {/* ── Panel Header ───────────────────────────────────────────────── */}
          <section>
            {/* Breadcrumb */}
            <nav className="flex items-center gap-1.5 text-sm text-gray-500 mb-4 flex-wrap min-w-0">
              <Link href="/dashboard" className="hover:text-gray-700 shrink-0">
                Projects
              </Link>
              <span className="shrink-0">/</span>
              <Link
                href={`/projects/${panel.projectId}`}
                className="hover:text-gray-700 truncate max-w-[140px] sm:max-w-xs"
              >
                {panel.project.name}
              </Link>
              <span className="shrink-0">/</span>
              <span className="text-gray-900 font-medium shrink-0">
                Panel {panel.panelIdentifier}
              </span>
            </nav>

            {/* Title + badges */}
            <div className="flex flex-wrap items-center gap-3 mb-5">
              <h1 className="text-xl font-bold text-gray-900">
                Panel {panel.panelIdentifier}
              </h1>
              <StatusBadge status={panel.status} />
              <AssemblyBadge type={panel.assemblyType} />
            </div>

            {/* Metadata grid — 2-col on mobile, 3-col on sm+ */}
            <dl className="bg-white border border-gray-200 rounded-xl p-5 grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-5">
              {[
                { label: "Dimensions",     value: panel.dimensions ?? "—" },
                { label: "Location",       value: panel.location   ?? "—" },
                { label: "Elevation",      value: panel.elevation  ?? "—" },
                { label: "Shear Wall",     value: panel.isShearWall ? "Yes" : "No" },
                { label: "Window",         value: panel.hasWindow   ? "Yes" : "No" },
                {
                  label: "Assembly System",
                  value: panel.assemblyType
                    ? assemblyFullName[panel.assemblyType]
                    : "—",
                },
              ].map(({ label, value }) => (
                <div key={label}>
                  <dt className="text-xs font-medium text-gray-400 uppercase tracking-wide mb-0.5">
                    {label}
                  </dt>
                  <dd className="text-sm text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          {/* ── Shop Drawing Placeholder ──────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              Shop Drawing
            </h2>
            <div className="border-2 border-dashed border-gray-200 rounded-xl p-10 flex flex-col items-center justify-center gap-3 bg-white text-center">
              <svg
                className="w-10 h-10 text-gray-300"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.5}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z"
                />
              </svg>
              <p className="text-sm text-gray-400">Shop drawing will be uploaded here</p>
            </div>
          </section>

          {/* ── QA/QC Checklist ──────────────────────────────────────────── */}
          <ChecklistSection
            panelId={panelId}
            steps={steps.map((s) => ({
              id:          s.id,
              name:        s.name,
              description: s.description,
              stepOrder:   s.stepOrder,
            }))}
            records={serializedRecords}
            role={role ?? ""}
            recordCount={recordCount}
            totalSteps={totalSteps}
            hideCta={showStickyInspect}
          />

          {/* ── Activity Log ─────────────────────────────────────────────── */}
          <ActivityLog logs={serializedLogs} />

          {/* ── QR Code Placeholder ──────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              QR Code
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl p-5 flex items-center gap-4">
              <svg className="w-14 h-14 text-gray-200 shrink-0" viewBox="0 0 100 100" fill="currentColor">
                <rect x="10" y="10" width="35" height="35" rx="4" />
                <rect x="55" y="10" width="35" height="35" rx="4" />
                <rect x="10" y="55" width="35" height="35" rx="4" />
                <rect x="18" y="18" width="19" height="19" fill="white" />
                <rect x="63" y="18" width="19" height="19" fill="white" />
                <rect x="18" y="63" width="19" height="19" fill="white" />
                <rect x="24" y="24" width="7"  height="7"  />
                <rect x="69" y="24" width="7"  height="7"  />
                <rect x="24" y="69" width="7"  height="7"  />
                <rect x="55" y="55" width="12" height="12" rx="2" />
                <rect x="72" y="55" width="13" height="12" rx="2" />
                <rect x="55" y="72" width="13" height="13" rx="2" />
                <rect x="72" y="72" width="13" height="13" rx="2" />
              </svg>
              <p className="text-sm text-gray-400">QR code generation available in Milestone 2</p>
            </div>
          </section>

        </div>
      </main>

      {/* Floating inspection CTA — inspectors with incomplete steps */}
      {showStickyInspect && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-20">
          <Link
            href={`/panels/${panelId}/inspect`}
            className="flex items-center gap-2.5 px-8 py-3.5 rounded-full bg-gray-900 text-white text-sm font-semibold shadow-xl shadow-gray-900/30 hover:bg-gray-700 active:scale-95 transition-all whitespace-nowrap"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            {recordCount === 0 ? "Start Inspection" : "Continue Inspection"}
          </Link>
        </div>
      )}
    </>
  )
}
