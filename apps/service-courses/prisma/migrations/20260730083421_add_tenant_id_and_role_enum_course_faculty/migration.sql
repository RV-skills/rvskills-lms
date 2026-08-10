/*
  Warnings:

  - The `role` column on the `CourseFaculty` table would be dropped and recreated. This will lead to data loss if there is data in the column.
  - Added the required column `tenant_id` to the `CourseFaculty` table without a default value. This is not possible if the table is not empty.

*/
-- CreateEnum
CREATE TYPE "FacultyRole" AS ENUM ('primary', 'co_faculty', 'ta');

-- AlterTable
ALTER TABLE "CourseFaculty" ADD COLUMN     "tenant_id" TEXT NOT NULL,
DROP COLUMN "role",
ADD COLUMN     "role" "FacultyRole" NOT NULL DEFAULT 'primary';
