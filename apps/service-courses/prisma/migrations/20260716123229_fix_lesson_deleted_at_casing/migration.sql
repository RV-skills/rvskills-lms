/*
  Warnings:

  - You are about to drop the column `deleted_At` on the `Lesson` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Lesson" DROP COLUMN "deleted_At",
ADD COLUMN     "deleted_at" TIMESTAMP(3);
