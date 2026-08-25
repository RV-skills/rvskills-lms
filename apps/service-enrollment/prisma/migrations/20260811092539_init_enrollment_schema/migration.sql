-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID', 'FREE', 'REFUNDED');

-- CreateEnum
CREATE TYPE "EnrollmentStatus" AS ENUM ('ACTIVE', 'COMPLETED', 'DROPPED');

-- CreateTable
CREATE TABLE "Enrollment" (
    "enrollment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "status" "EnrollmentStatus" NOT NULL DEFAULT 'ACTIVE',
    "payment_status" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
    "enrolled_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed_at" TIMESTAMP(3),
    "dropped_at" TIMESTAMP(3),

    CONSTRAINT "Enrollment_pkey" PRIMARY KEY ("enrollment_id")
);

-- CreateTable
CREATE TABLE "LessonProgress" (
    "progress_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "completed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonProgress_pkey" PRIMARY KEY ("progress_id")
);

-- CreateTable
CREATE TABLE "CourseRating" (
    "rating_id" TEXT NOT NULL,
    "enrollment_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "stars" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CourseRating_pkey" PRIMARY KEY ("rating_id")
);

-- CreateCheck
ALTER TABLE "CourseRating" ADD CONSTRAINT "stars_range" CHECK ("stars" >= 1 AND "stars" <= 5);

-- CreateIndex
CREATE INDEX "Enrollment_tenant_id_course_id_idx" ON "Enrollment"("tenant_id", "course_id");

-- CreateIndex
CREATE INDEX "Enrollment_tenant_id_student_id_idx" ON "Enrollment"("tenant_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "Enrollment_student_id_course_id_key" ON "Enrollment"("student_id", "course_id");

-- CreateIndex
CREATE UNIQUE INDEX "LessonProgress_enrollment_id_lesson_id_key" ON "LessonProgress"("enrollment_id", "lesson_id");

-- CreateIndex
CREATE UNIQUE INDEX "CourseRating_enrollment_id_key" ON "CourseRating"("enrollment_id");

-- AddForeignKey
ALTER TABLE "LessonProgress" ADD CONSTRAINT "LessonProgress_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "Enrollment"("enrollment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CourseRating" ADD CONSTRAINT "CourseRating_enrollment_id_fkey" FOREIGN KEY ("enrollment_id") REFERENCES "Enrollment"("enrollment_id") ON DELETE CASCADE ON UPDATE CASCADE;
