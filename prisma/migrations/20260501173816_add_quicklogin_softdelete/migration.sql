-- AlterTable
ALTER TABLE "User" ADD COLUMN     "deletedAt" TIMESTAMP(3),
ADD COLUMN     "quickLogin" BOOLEAN NOT NULL DEFAULT false;
