import { auth } from "@/auth"
import { prisma } from "@/lib/prisma"
import { redirect, notFound } from "next/navigation"
import InspectionForm from "@/components/InspectionForm"

export default async function InspectPage({
  params,
}: {
  params: Promise<{ panelId: string }>
}) {
  const { panelId } = await params
  const session = await auth()
  const userId = session?.user?.id
  const role   = session?.user?.role

  // Admins view panels read-only; non-authenticated users go to login
  if (!userId) redirect("/login")
  if (role === "ADMIN") redirect(`/panels/${panelId}`)

  const panel = await prisma.panel.findUnique({
    where: { id: panelId },
    include: { project: true },
  })
  if (!panel) notFound()

  // Inspector must be assigned to this project
  const assignment = await prisma.projectAssignment.findUnique({
    where: { userId_projectId: { userId, projectId: panel.projectId } },
  })
  if (!assignment) redirect("/dashboard")

  // Fetch steps and any existing records in parallel
  const [steps, existingRecords] = await Promise.all([
    prisma.inspectionStep.findMany({ orderBy: { stepOrder: "asc" } }),
    prisma.inspectionRecord.findMany({
      where:  { panelId },
      select: { stepId: true, result: true },
    }),
  ])

  const completedStepIds = new Set(existingRecords.map((r) => r.stepId))

  // First incomplete step index; -1 means all done → use steps.length to trigger completion screen
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
