-- CreateTable
CREATE TABLE "LessonResource" (
    "resource_id" TEXT NOT NULL,
    "lesson_id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pdf_url" TEXT NOT NULL,
    "order_index" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LessonResource_pkey" PRIMARY KEY ("resource_id")
);

-- AddForeignKey
ALTER TABLE "LessonResource" ADD CONSTRAINT "LessonResource_lesson_id_fkey" FOREIGN KEY ("lesson_id") REFERENCES "Lesson"("lesson_id") ON DELETE RESTRICT ON UPDATE CASCADE;
