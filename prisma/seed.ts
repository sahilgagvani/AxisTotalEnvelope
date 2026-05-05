import { PrismaClient, Role, AssemblyType, PanelStatus } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

// ─── Edit this list to add/remove/update users ───────────────────────────────
const users: { username: string; name: string; pin: string; role: Role; quickLogin: boolean }[] = [
  { username: 'admin',     name: 'Ashraf',  pin: '1234', role: 'ADMIN',        quickLogin: false },
  { username: 'inspector', name: 'Joanna',  pin: '5678', role: 'QC_INSPECTOR', quickLogin: true  },
  { username: 'engineer',  name: 'Sahil',   pin: '5678', role: 'ENGINEER',     quickLogin: true  },
]
// ─────────────────────────────────────────────────────────────────────────────

const inspectionSteps = [
  { stepOrder: 1, name: 'Slab Edge Firestopping',               description: '4lb density mineral wool, compressed ~50%, installed at panel top' },
  { stepOrder: 2, name: 'Air Barrier & Joint Fabric Treatment',  description: 'Continuous air/moisture barrier applied to sheathing joints' },
  { stepOrder: 3, name: 'Drainage System Installation',          description: 'Proprietary 2-part drainage system at panel base and above openings' },
  { stepOrder: 4, name: 'Insulation',                            description: 'EPS foam or mineral wool board installed per spec' },
  { stepOrder: 5, name: 'Surface Preparation',                   description: 'Rasping of EPS foam or drainscreen installation depending on assembly' },
  { stepOrder: 6, name: 'Basecoat & Reinforcing Mesh',           description: 'Base cement coat with embedded fiberglass mesh' },
  { stepOrder: 7, name: 'Primer Application',                    description: 'Primer coat applied to prepared basecoat surface' },
  { stepOrder: 8, name: 'Finish Coat',                           description: 'Acrylic finish – standard or specialty, with color and mix ID' },
  { stepOrder: 9, name: 'Final Review & Sign-off',               description: 'Overall panel quality check and completion confirmation' },
]

const panelsData: {
  panelIdentifier: string
  floor: number
  direction: string
  panelNumber: number
  heightMm: number
  widthMm: number
  diagonalMm: number | null
  topOfBottomM: number
  topOfTopM: number
  openingCount: number
  openingCallouts: string | null
  assemblyType: AssemblyType
  isShearWall: boolean
  finishes: string | null
  drawingSheet: string | null
  notes: string | null
  status: PanelStatus
}[] = [
  // Floor 1 — East
  { panelIdentifier: '1E-100', floor: 1, direction: 'East',  panelNumber: 100, heightMm: 3137, widthMm: 3139, diagonalMm: 4427, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'W01R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.00a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1E-101', floor: 1, direction: 'East',  panelNumber: 101, heightMm: 3137, widthMm: 3315, diagonalMm: 4565, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'W01R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.01a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1E-102', floor: 1, direction: 'East',  panelNumber: 102, heightMm: 3137, widthMm: 4000, diagonalMm: 5176, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'WW8R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.02a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1E-103', floor: 1, direction: 'East',  panelNumber: 103, heightMm: 3137, widthMm: 3045, diagonalMm: 4374, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'W01',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.03a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1E-104', floor: 1, direction: 'East',  panelNumber: 104, heightMm: 3137, widthMm: 5930, diagonalMm: 6710, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 2, openingCallouts: 'W01 + WW8R',   assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.04a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1E-105', floor: 1, direction: 'East',  panelNumber: 105, heightMm: 3137, widthMm: 4030, diagonalMm: 5109, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'WW8R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.05a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1E-106', floor: 1, direction: 'East',  panelNumber: 106, heightMm: 3137, widthMm: 4030, diagonalMm: 5109, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'WW8R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.06a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1E-107', floor: 1, direction: 'East',  panelNumber: 107, heightMm: 3137, widthMm: 5930, diagonalMm: 6710, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 2, openingCallouts: 'WW8 + W01',    assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.07a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1E-108', floor: 1, direction: 'East',  panelNumber: 108, heightMm: 3137, widthMm: 3170, diagonalMm: 4462, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'W01R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.08a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1E-109', floor: 1, direction: 'East',  panelNumber: 109, heightMm: 3137, widthMm: 7330, diagonalMm: 7974, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 2, openingCallouts: '111B + W01',   assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.09a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1E-110', floor: 1, direction: 'East',  panelNumber: 110, heightMm: 3137, widthMm: 3624, diagonalMm: 4565, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'W01',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.10a', notes: null, status: 'NOT_STARTED' },
  // Floor 1 — North
  { panelIdentifier: '1N-123', floor: 1, direction: 'North', panelNumber: 123, heightMm: 3137, widthMm: 5549, diagonalMm: 6272, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'W01R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.21a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1N-124', floor: 1, direction: 'North', panelNumber: 124, heightMm: 3137, widthMm: 4980, diagonalMm: 5887, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'W02',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.22a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1N-125', floor: 1, direction: 'North', panelNumber: 125, heightMm: 3137, widthMm: 4979, diagonalMm: 5887, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'WW8',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.23a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1N-126', floor: 1, direction: 'North', panelNumber: 126, heightMm: 3137, widthMm: 4288, diagonalMm: 5314, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 0, openingCallouts: null,           assemblyType: 'EPS', isShearWall: true,  finishes: 'EF-01',        drawingSheet: 'A4.24a', notes: null, status: 'NOT_STARTED' },
  // Floor 1 — South
  { panelIdentifier: '1S-111', floor: 1, direction: 'South', panelNumber: 111, heightMm: 3137, widthMm: 2798, diagonalMm: 4190, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 0, openingCallouts: null,           assemblyType: 'EPS', isShearWall: true,  finishes: 'EF-01',        drawingSheet: 'A4.11a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1S-112', floor: 1, direction: 'South', panelNumber: 112, heightMm: 3137, widthMm: 6470, diagonalMm: 7200, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'WW8R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.12a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1S-113', floor: 1, direction: 'South', panelNumber: 113, heightMm: 3137, widthMm: 4980, diagonalMm: 5887, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'WW8',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.13a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1S-114', floor: 1, direction: 'South', panelNumber: 114, heightMm: 3137, widthMm: 5080, diagonalMm: 5972, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'WW8',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.14a', notes: null, status: 'NOT_STARTED' },
  // Floor 1 — West
  { panelIdentifier: '1W-115', floor: 1, direction: 'West',  panelNumber: 115, heightMm: 2577, widthMm: 5713, diagonalMm: null,   topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 0, openingCallouts: null,           assemblyType: 'EPS', isShearWall: true,  finishes: 'EF-01',        drawingSheet: 'A4.15a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1W-116', floor: 1, direction: 'West',  panelNumber: 116, heightMm: 3137, widthMm: 2995, diagonalMm: 4353, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'W03SP',        assemblyType: 'FRR', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.16a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1W-117', floor: 1, direction: 'West',  panelNumber: 117, heightMm: 3137, widthMm: 3520, diagonalMm: 4715, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'W01P',         assemblyType: 'FRR', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.17a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1W-118', floor: 1, direction: 'West',  panelNumber: 118, heightMm: 3137, widthMm: 5195, diagonalMm: 6070, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'WW8R',         assemblyType: 'FRR', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.18a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1W-120', floor: 1, direction: 'West',  panelNumber: 120, heightMm: 3137, widthMm: 3110, diagonalMm: 4513, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 1, openingCallouts: 'W01SP',        assemblyType: 'FRR', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A4.19a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '1W-121', floor: 1, direction: 'West',  panelNumber: 121, heightMm: 3137, widthMm: 2873, diagonalMm: 5417, topOfBottomM: 72.5, topOfTopM: 75.75, openingCount: 0, openingCallouts: null,           assemblyType: 'FRR', isShearWall: true,  finishes: 'EF-01',        drawingSheet: 'A4.20a', notes: null, status: 'NOT_STARTED' },
  // Floor 2 — East
  { panelIdentifier: '2E-100', floor: 2, direction: 'East',  panelNumber: 100, heightMm: 2827, widthMm: 3139, diagonalMm: 4102, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01',          assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.00a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-101', floor: 2, direction: 'East',  panelNumber: 101, heightMm: 2827, widthMm: 3315, diagonalMm: 4358, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01R',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.01a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-102', floor: 2, direction: 'East',  panelNumber: 102, heightMm: 2827, widthMm: 4115, diagonalMm: 4994, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'SD02R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.02a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-103', floor: 2, direction: 'East',  panelNumber: 103, heightMm: 2827, widthMm: 3045, diagonalMm: 4157, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01',          assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.03a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-104', floor: 2, direction: 'East',  panelNumber: 104, heightMm: 2827, widthMm: 5930, diagonalMm: 6570, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 2, openingCallouts: 'W01R + SD02R',  assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.04a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-105', floor: 2, direction: 'East',  panelNumber: 105, heightMm: 2827, widthMm: 4030, diagonalMm: 4924, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'SD02R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.05a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-106', floor: 2, direction: 'East',  panelNumber: 106, heightMm: 2827, widthMm: 4030, diagonalMm: 4924, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'SD02R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.06a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-107', floor: 2, direction: 'East',  panelNumber: 107, heightMm: 2827, widthMm: 5930, diagonalMm: 6570, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 2, openingCallouts: 'SD02R + W01',   assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.07a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-108', floor: 2, direction: 'East',  panelNumber: 108, heightMm: 2827, widthMm: 3170, diagonalMm: 4249, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01R',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.08a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-109', floor: 2, direction: 'East',  panelNumber: 109, heightMm: 2827, widthMm: 3990, diagonalMm: 4892, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'SD03',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01',        drawingSheet: 'A5.09a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-110', floor: 2, direction: 'East',  panelNumber: 110, heightMm: 2827, widthMm: 7330, diagonalMm: 7857, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'SD02R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-03',        drawingSheet: 'A5.10a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2E-111', floor: 2, direction: 'East',  panelNumber: 111, heightMm: 2827, widthMm: 3624, diagonalMm: 4466, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01R',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.11a', notes: null, status: 'NOT_STARTED' },
  // Floor 2 — North
  { panelIdentifier: '2N-126', floor: 2, direction: 'North', panelNumber: 126, heightMm: 2827, widthMm: 3390, diagonalMm: 4400, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01R',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.26a', notes: 'RFI - On Hold', status: 'NOT_STARTED' },
  { panelIdentifier: '2N-127', floor: 2, direction: 'North', panelNumber: 127, heightMm: 2827, widthMm: 5549, diagonalMm: 6128, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01R',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.27a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2N-128', floor: 2, direction: 'North', panelNumber: 128, heightMm: 2827, widthMm: 4980, diagonalMm: 5727, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W02',          assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.28a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2N-129', floor: 2, direction: 'North', panelNumber: 129, heightMm: 2827, widthMm: 4980, diagonalMm: 5726, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'SD02',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.29a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2N-130', floor: 2, direction: 'North', panelNumber: 130, heightMm: 2827, widthMm: 4288, diagonalMm: 5137, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 0, openingCallouts: null,           assemblyType: 'EPS', isShearWall: true,  finishes: 'EF-01',        drawingSheet: 'A5.30a', notes: null, status: 'NOT_STARTED' },
  // Floor 2 — South
  { panelIdentifier: '2S-112', floor: 2, direction: 'South', panelNumber: 112, heightMm: 2827, widthMm: 2798, diagonalMm: 3980, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 0, openingCallouts: null,           assemblyType: 'EPS', isShearWall: true,  finishes: 'EF-01',        drawingSheet: 'A5.12a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2S-113', floor: 2, direction: 'South', panelNumber: 113, heightMm: 2827, widthMm: 6470, diagonalMm: 7062, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'SD02R',        assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.13a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2S-114', floor: 2, direction: 'South', panelNumber: 114, heightMm: 2827, widthMm: 4980, diagonalMm: 5728, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'SD02',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.14a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2S-115', floor: 2, direction: 'South', panelNumber: 115, heightMm: 2827, widthMm: 5080, diagonalMm: 5815, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'SD02',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.15a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2S-116', floor: 2, direction: 'South', panelNumber: 116, heightMm: 2827, widthMm: 6180, diagonalMm: 6712, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 2, openingCallouts: 'W02 + SD02',    assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01',        drawingSheet: 'A5.16a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2S-117', floor: 2, direction: 'South', panelNumber: 117, heightMm: 2827, widthMm: 3730, diagonalMm: 4682, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'SD02',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01',        drawingSheet: 'A5.17a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2S-118', floor: 2, direction: 'South', panelNumber: 118, heightMm: 2827, widthMm: 3904, diagonalMm: 4686, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01R',         assemblyType: 'EPS', isShearWall: false, finishes: 'EF-01',        drawingSheet: 'A5.18a', notes: null, status: 'NOT_STARTED' },
  // Floor 2 — West
  { panelIdentifier: '2W-119', floor: 2, direction: 'West',  panelNumber: 119, heightMm: 2827, widthMm: 5713, diagonalMm: 6357, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 0, openingCallouts: null,           assemblyType: 'EPS', isShearWall: true,  finishes: 'EF-01',        drawingSheet: 'A5.19a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2W-120', floor: 2, direction: 'West',  panelNumber: 120, heightMm: 2827, widthMm: 2995, diagonalMm: 4118, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W03SP',        assemblyType: 'FRR', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.20a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2W-121', floor: 2, direction: 'West',  panelNumber: 121, heightMm: 2827, widthMm: 3520, diagonalMm: 4516, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01',          assemblyType: 'FRR', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.21a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2W-122', floor: 2, direction: 'West',  panelNumber: 122, heightMm: 2827, widthMm: 5195, diagonalMm: 5913, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'WW8R',         assemblyType: 'FRR', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.22a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2W-123', floor: 2, direction: 'West',  panelNumber: 123, heightMm: 2827, widthMm: 4230, diagonalMm: 5040, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01SP',        assemblyType: 'FRR', isShearWall: false, finishes: 'EF-01',        drawingSheet: 'A5.23a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2W-124', floor: 2, direction: 'West',  panelNumber: 124, heightMm: 2827, widthMm: 3110, diagonalMm: 4202, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 1, openingCallouts: 'W01SP',        assemblyType: 'FRR', isShearWall: false, finishes: 'EF-01, EF-03', drawingSheet: 'A5.24a', notes: null, status: 'NOT_STARTED' },
  { panelIdentifier: '2W-125', floor: 2, direction: 'West',  panelNumber: 125, heightMm: 2827, widthMm: 2873, diagonalMm: 4037, topOfBottomM: 75.75, topOfTopM: 78.6, openingCount: 0, openingCallouts: null,           assemblyType: 'FRR', isShearWall: true,  finishes: 'EF-01',        drawingSheet: 'A5.25a', notes: null, status: 'NOT_STARTED' },
]

async function main() {
  // ─── 0. Wipe all data in FK-safe order ────────────────────────────────────
  console.log('🧹 Clearing database...')
  await prisma.photo.deleteMany()
  await prisma.auditLog.deleteMany()
  await prisma.inspectionRecord.deleteMany()
  await prisma.panel.deleteMany()
  await prisma.inspectionStep.deleteMany()
  // Only delete users not in the seed list (preserve login credentials between runs)
  await prisma.user.deleteMany({
    where: { username: { notIn: users.map(u => u.username) } },
  })
  console.log('✅ Database cleared')

  // ─── 1. Users ──────────────────────────────────────────────────────────────
  for (const user of users) {
    const hashed = await bcrypt.hash(user.pin, 10)
    await prisma.user.upsert({
      where:  { username: user.username },
      update: { name: user.name, pin: hashed, role: user.role, quickLogin: user.quickLogin },
      create: { username: user.username, name: user.name, pin: hashed, role: user.role, quickLogin: user.quickLogin },
    })
    console.log(`✅ Upserted user: ${user.username} (${user.role})`)
  }

  // ─── 2. Panels ─────────────────────────────────────────────────────────────
  for (const panel of panelsData) {
    await prisma.panel.create({ data: panel })
    console.log(`✅ Created panel: ${panel.panelIdentifier} (${panel.assemblyType})`)
  }

  // ─── 3. Inspection Steps ───────────────────────────────────────────────────
  for (const step of inspectionSteps) {
    await prisma.inspectionStep.create({ data: step })
    console.log(`✅ Created inspection step ${step.stepOrder}: "${step.name}"`)
  }
}

main()
  .catch((e) => { console.error(e); process.exit(1) })
  .finally(() => prisma.$disconnect())
