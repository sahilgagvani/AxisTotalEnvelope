-- AlterTable
ALTER TABLE "Panel" DROP COLUMN "dimensions",
DROP COLUMN "drawingUrl",
DROP COLUMN "elevation",
DROP COLUMN "hasWindow",
DROP COLUMN "location",
ADD COLUMN     "diagonalMm" INTEGER,
ADD COLUMN     "direction" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "drawingSheet" TEXT,
ADD COLUMN     "finishes" TEXT,
ADD COLUMN     "floor" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "heightMm" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "notes" TEXT,
ADD COLUMN     "openingCallouts" TEXT,
ADD COLUMN     "openingCount" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "panelNumber" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "topOfBottomM" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "topOfTopM" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "widthMm" INTEGER NOT NULL DEFAULT 0,
ALTER COLUMN "assemblyType" SET NOT NULL;

-- Remove temporary defaults (columns are populated by seed)
ALTER TABLE "Panel" ALTER COLUMN "direction" DROP DEFAULT;
ALTER TABLE "Panel" ALTER COLUMN "floor" DROP DEFAULT;
ALTER TABLE "Panel" ALTER COLUMN "heightMm" DROP DEFAULT;
ALTER TABLE "Panel" ALTER COLUMN "panelNumber" DROP DEFAULT;
ALTER TABLE "Panel" ALTER COLUMN "topOfBottomM" DROP DEFAULT;
ALTER TABLE "Panel" ALTER COLUMN "topOfTopM" DROP DEFAULT;
ALTER TABLE "Panel" ALTER COLUMN "widthMm" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX "Panel_panelIdentifier_key" ON "Panel"("panelIdentifier");
