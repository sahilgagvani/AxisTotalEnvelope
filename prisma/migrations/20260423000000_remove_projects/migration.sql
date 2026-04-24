-- Drop foreign key from Panel to Project
ALTER TABLE "Panel" DROP CONSTRAINT "Panel_projectId_fkey";

-- Drop projectId column from Panel
ALTER TABLE "Panel" DROP COLUMN "projectId";

-- Drop ProjectAssignment (must go before Project due to FK)
DROP TABLE "ProjectAssignment";

-- Drop Project
DROP TABLE "Project";
