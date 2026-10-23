-- AlterTable
ALTER TABLE "Enrollment" ADD COLUMN     "batch_id" TEXT;

-- CreateTable
CREATE TABLE "Batch" (
    "batch_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "start_date" DATE NOT NULL,
    "end_date" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Batch_pkey" PRIMARY KEY ("batch_id")
);

-- CreateTable
CREATE TABLE "BatchModuleDate" (
    "batch_id" TEXT NOT NULL,
    "module_id" TEXT NOT NULL,
    "unlock_date" DATE NOT NULL,

    CONSTRAINT "BatchModuleDate_pkey" PRIMARY KEY ("batch_id","module_id")
);

-- CreateIndex
CREATE INDEX "Batch_tenant_id_course_id_idx" ON "Batch"("tenant_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "Batch_course_id_name_key" ON "Batch"("course_id", "name");

-- CreateIndex
CREATE INDEX "Enrollment_batch_id_idx" ON "Enrollment"("batch_id");

-- AddForeignKey
ALTER TABLE "Enrollment" ADD CONSTRAINT "Enrollment_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "Batch"("batch_id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BatchModuleDate" ADD CONSTRAINT "BatchModuleDate_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "Batch"("batch_id") ON DELETE CASCADE ON UPDATE CASCADE;
