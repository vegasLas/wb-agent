-- CreateEnum
CREATE TYPE "Permission" AS ENUM ('PROMOTIONS', 'FEEDBACKS', 'REPORTS', 'ADVERTS', 'SUPPLIES');

-- AlterTable
ALTER TABLE "Supplier" ADD COLUMN "permissions" "Permission"[] DEFAULT ARRAY[]::"Permission"[];
