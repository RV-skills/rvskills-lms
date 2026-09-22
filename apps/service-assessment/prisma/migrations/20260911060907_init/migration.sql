-- CreateEnum
CREATE TYPE "QuestionType" AS ENUM ('MCQ', 'MANUAL');

-- CreateEnum
CREATE TYPE "AttemptStatus" AS ENUM ('IN_PROGRESS', 'SUBMITTED', 'PENDING_REVIEW', 'GRADED');

-- CreateTable
CREATE TABLE "Assessment" (
    "assessment_id" TEXT NOT NULL,
    "course_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "passing_percentage" INTEGER NOT NULL,
    "max_attempts" INTEGER,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Assessment_pkey" PRIMARY KEY ("assessment_id")
);

-- CreateTable
CREATE TABLE "Question" (
    "question_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "type" "QuestionType" NOT NULL,
    "prompt" TEXT NOT NULL,
    "points" INTEGER NOT NULL DEFAULT 1,
    "order_index" INTEGER NOT NULL,
    "is_locked" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "Question_pkey" PRIMARY KEY ("question_id")
);

-- CreateTable
CREATE TABLE "QuestionOption" (
    "option_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "is_correct" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "QuestionOption_pkey" PRIMARY KEY ("option_id")
);

-- CreateTable
CREATE TABLE "AssessmentAttempt" (
    "attempt_id" TEXT NOT NULL,
    "assessment_id" TEXT NOT NULL,
    "student_id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "attempt_number" INTEGER NOT NULL,
    "status" "AttemptStatus" NOT NULL DEFAULT 'IN_PROGRESS',
    "score_percentage" INTEGER,
    "passed" BOOLEAN,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "submitted_at" TIMESTAMP(3),
    "graded_at" TIMESTAMP(3),

    CONSTRAINT "AssessmentAttempt_pkey" PRIMARY KEY ("attempt_id")
);

-- CreateTable
CREATE TABLE "Answer" (
    "answer_id" TEXT NOT NULL,
    "attempt_id" TEXT NOT NULL,
    "question_id" TEXT NOT NULL,
    "selected_option_id" TEXT,
    "text_response" TEXT,
    "is_correct" BOOLEAN,
    "points_awarded" INTEGER,

    CONSTRAINT "Answer_pkey" PRIMARY KEY ("answer_id")
);

-- CreateIndex
CREATE INDEX "Assessment_tenant_id_course_id_idx" ON "Assessment"("tenant_id", "course_id");

-- CreateIndex
CREATE INDEX "Question_assessment_id_order_index_idx" ON "Question"("assessment_id", "order_index");

-- CreateIndex
CREATE INDEX "AssessmentAttempt_tenant_id_student_id_idx" ON "AssessmentAttempt"("tenant_id", "student_id");

-- CreateIndex
CREATE UNIQUE INDEX "AssessmentAttempt_assessment_id_student_id_attempt_number_key" ON "AssessmentAttempt"("assessment_id", "student_id", "attempt_number");

-- CreateIndex
CREATE UNIQUE INDEX "Answer_attempt_id_question_id_key" ON "Answer"("attempt_id", "question_id");

-- AddForeignKey
ALTER TABLE "Question" ADD CONSTRAINT "Question_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "QuestionOption" ADD CONSTRAINT "QuestionOption_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AssessmentAttempt" ADD CONSTRAINT "AssessmentAttempt_assessment_id_fkey" FOREIGN KEY ("assessment_id") REFERENCES "Assessment"("assessment_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_attempt_id_fkey" FOREIGN KEY ("attempt_id") REFERENCES "AssessmentAttempt"("attempt_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Answer" ADD CONSTRAINT "Answer_question_id_fkey" FOREIGN KEY ("question_id") REFERENCES "Question"("question_id") ON DELETE CASCADE ON UPDATE CASCADE;
