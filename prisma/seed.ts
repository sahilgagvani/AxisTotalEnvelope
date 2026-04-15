import { PrismaClient, Role, AssemblyType, PanelStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Edit this list to add/remove/update users ───────────────────────────────
const users: { username: string; name: string; pin: string; role: Role }[] = [
  { username: 'admin',     name: 'Sahil', pin: '1234', role: 'ADMIN'        },
  { username: 'inspector', name: 'Ash',  pin: '5678', role: 'QC_INSPECTOR' },
]
// ─────────────────────────────────────────────────────────────────────────────

const inspectionSteps = [
  { stepOrder: 1, name: 'Slab Edge Firestopping',          description: '4lb density mineral wool, compressed ~50%, installed at panel top' },
  { stepOrder: 2, name: 'Air Barrier & Joint Fabric Treatment', description: 'Continuous air/moisture barrier applied to sheathing joints' },
  { stepOrder: 3, name: 'Drainage System Installation',    description: 'Proprietary 2-part drainage system at panel base and above openings' },
  { stepOrder: 4, name: 'Insulation',                      description: 'EPS foam or mineral wool board installed per spec' },
  { stepOrder: 5, name: 'Surface Preparation',             description: 'Rasping of EPS foam or drainscreen installation depending on assembly' },
  { stepOrder: 6, name: 'Basecoat & Reinforcing Mesh',     description: 'Base cement coat with embedded fiberglass mesh' },
  { stepOrder: 7, name: 'Primer Application',              description: 'Primer coat applied to prepared basecoat surface' },
  { stepOrder: 8, name: 'Finish Coat',                     description: 'Acrylic finish – standard or specialty, with color and mix ID' },
  { stepOrder: 9, name: 'Final Review & Sign-off',         description: 'Overall panel quality check and completion confirmation' },
]

const panelsData: {
  panelIdentifier: string
  assemblyType: AssemblyType
  isShearWall: boolean
  hasWindow: boolean
  dimensions: string
  location: string
  elevation: string
  status: PanelStatus
}[] = [
  { panelIdentifier: '3E-100', assemblyType: 'EPS', isShearWall: false, hasWindow: true,  dimensions: '3200mm x 2800mm', location: 'Level 3, Panel 100', elevation: 'East',  status: 'NOT_STARTED' },
  { panelIdentifier: '3E-101', assemblyType: 'EPS', isShearWall: false, hasWindow: false, dimensions: '2400mm x 2800mm', location: 'Level 3, Panel 101', elevation: 'East',  status: 'NOT_STARTED' },
  { panelIdentifier: '3E-102', assemblyType: 'FRR', isShearWall: true,  hasWindow: false, dimensions: '1800mm x 2800mm', location: 'Level 3, Panel 102', elevation: 'East',  status: 'NOT_STARTED' },
  { panelIdentifier: '3N-200', assemblyType: 'EPS', isShearWall: false, hasWindow: true,  dimensions: '3600mm x 2800mm', location: 'Level 3, Panel 200', elevation: 'North', status: 'NOT_STARTED' },
  { panelIdentifier: '4E-100', assemblyType: 'FRR', isShearWall: true,  hasWindow: true,  dimensions: '3200mm x 3200mm', location: 'Level 4, Panel 100', elevation: 'East',  status: 'NOT_STARTED' },
]

async function main() {
  // ─── 1. Users ──────────────────────────────────────────────────────────────
  const seededUsernames: string[] = []

  for (const user of users) {
    const hashed = await bcrypt.hash(user.pin, 10)
    await prisma.user.upsert({
      where:  { username: user.username },
      update: { name: user.name, pin: hashed, role: user.role },
      create: { username: user.username, name: user.name, pin: hashed, role: user.role },
    })
    seededUsernames.push(user.username)
    console.log(`✅ Upserted user: ${user.username} (${user.role})`)
  }

  // Remove any users in the DB that are no longer in the list above
  const { count: removedUsers } = await prisma.user.deleteMany({
    where: { username: { notIn: seededUsernames } },
  })
  if (removedUsers > 0) console.log(`🗑️  Removed ${removedUsers} user(s) no longer in seed list`)

  // ─── 2. Project ────────────────────────────────────────────────────────────
  const projectName = '18 Louisa – Burmont Construction'
  const project = await prisma.project.upsert({
    where:  { name: projectName },
    update: {
      description: 'EIFS prefabricated wall panels – Phase 1 shop manufacturing',
      clientName:  'Burmont Construction',
      address:     '18 Louisa Street, Ottawa, ON',
    },
    create: {
      name:        projectName,
      description: 'EIFS prefabricated wall panels – Phase 1 shop manufacturing',
      clientName:  'Burmont Construction',
      address:     '18 Louisa Street, Ottawa, ON',
    },
  })
  console.log(`✅ Upserted project: "${project.name}" (${project.id})`)

  // ─── 3. Panels ─────────────────────────────────────────────────────────────
  // Delete existing panels for this project and recreate fresh
  const { count: deletedPanels } = await prisma.panel.deleteMany({
    where: { projectId: project.id },
  })
  if (deletedPanels > 0) console.log(`🗑️  Removed ${deletedPanels} existing panel(s) for project`)

  for (const panel of panelsData) {
    await prisma.panel.create({
      data: { ...panel, projectId: project.id },
    })
    console.log(`✅ Created panel: ${panel.panelIdentifier} (${panel.assemblyType})`)
  }

  // ─── 4. Project Assignment ─────────────────────────────────────────────────
  const inspector = await prisma.user.findUniqueOrThrow({ where: { username: 'inspector' } })
  await prisma.projectAssignment.upsert({
    where:  { userId_projectId: { userId: inspector.id, projectId: project.id } },
    update: {},
    create: { userId: inspector.id, projectId: project.id },
  })
  console.log(`✅ Assigned inspector "${inspector.username}" to project "${project.name}"`)

  // ─── 5. Inspection Steps ───────────────────────────────────────────────────
  // Delete all existing steps and recreate fresh to ensure correct order/names
  const { count: deletedSteps } = await prisma.inspectionStep.deleteMany({})
  if (deletedSteps > 0) console.log(`🗑️  Removed ${deletedSteps} existing inspection step(s)`)

  for (const step of inspectionSteps) {
    await prisma.inspectionStep.create({ data: step })
    console.log(`✅ Created inspection step ${step.stepOrder}: "${step.name}"`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
