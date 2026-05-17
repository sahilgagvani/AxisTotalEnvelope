import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { notFound } from "next/navigation"
import Link from "next/link"
import ChecklistSection from "@/components/ChecklistSection"
import ActivityLog from "@/components/ActivityLog"
import QrCodeDisplay from "@/components/QrCodeDisplay"
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
  const role    = session?.user?.role
  const isInspector = role === "QC_INSPECTOR"

  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
    include: {
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
      r.auditLogs.map((log) => ({ ...log, stepName: r.step.name, stepOrder: r.step.stepOrder }))
    )
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

  const serializedLogs = allAuditLogs.slice(0, 50).map((log) => ({
    id:             log.id,
    action:         log.action,
    userName:       log.user.name ?? "Unknown",
    stepName:       log.stepName,
    stepOrder:      log.stepOrder,
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
                Panels
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
                { label: "Floor",          value: String(panel.floor) },
                { label: "Direction",      value: panel.direction },
                { label: "Height (mm)",    value: String(panel.heightMm) },
                { label: "Width (mm)",     value: String(panel.widthMm) },
                { label: "Diagonal (mm)",  value: panel.diagonalMm != null ? String(panel.diagonalMm) : "—" },
                { label: "Drawing Sheet",  value: panel.drawingSheet ?? "—" },
                { label: "Shear Wall",     value: panel.isShearWall ? "Yes" : "No" },
                { label: "Openings",       value: String(panel.openingCount) },
                { label: "Opening Refs",   value: panel.openingCallouts ?? "—" },
                { label: "Finishes",       value: panel.finishes ?? "—" },
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

          {/* ── Shop Drawing ─────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              Shop Drawing
            </h2>
            {panel.drawingUrl ? (
              <a
                href={panel.drawingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-gray-900 text-white text-sm font-medium hover:bg-gray-700 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                </svg>
                View Shop Drawing
              </a>
            ) : (
              <p className="text-sm text-gray-400">No shop drawing uploaded yet.</p>
            )}
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

          {/* ── QR Code ──────────────────────────────────────────────────── */}
          <section>
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-3">
              QR Code
            </h2>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <QrCodeDisplay panelId={panel.id} panelIdentifier={panel.panelIdentifier} />
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
