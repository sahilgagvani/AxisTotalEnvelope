import type { Metadata } from "next"
import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import InspectionForm from "@/components/InspectionForm"

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
      ? `Inspecting ${panel.panelIdentifier} — AXIS Total Envelope`
      : "Inspection — AXIS Total Envelope",
  }
}

export default async function InspectPage({
  params,
}: {
  params: Promise<{ panelId: string }>
}) {
  const { panelId } = await params
  const session = await auth()
  const userId = session?.user?.id
  const role   = session?.user?.role

  if (!userId) redirect("/login")
  if (role === "ADMIN") redirect(`/panels/${panelId}`)

  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
  })
  if (!panel) notFound()

  const [steps, existingRecords] = await Promise.all([
    prisma.inspectionStep.findMany({ orderBy: { stepOrder: "asc" } }),
    prisma.inspectionRecord.findMany({
      where:  { panelId },
      select: { stepId: true, result: true },
    }),
  ])

  const completedStepIds = new Set(existingRecords.map((r) => r.stepId))
  const firstIncomplete = steps.findIndex((s) => !completedStepIds.has(s.id))
  const initialStepIndex = firstIncomplete === -1 ? steps.length : firstIncomplete

  return (
    <InspectionForm
      panelId={panelId}
      panelIdentifier={panel.panelIdentifier}
      assemblyType={panel.assemblyType}
      steps={steps.map((s) => ({
        id:          s.id,
        name:        s.name,
        description: s.description,
        stepOrder:   s.stepOrder,
      }))}
      existingRecords={existingRecords.map((r) => ({
        stepId: r.stepId,
        result: r.result as string,
      }))}
      initialStepIndex={initialStepIndex}
    />
  )
}
