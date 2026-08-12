import { prisma } from "../db/prisma";

export const lessonProgressRepository = {
    async markComplete(enrollment_id: string, lesson_id: string) {
        return prisma.lessonProgress.upsert({
            where: {
                enrollment_id_lesson_id: { enrollment_id, lesson_id },
            },
            create: {
                enrollment_id,
                lesson_id
            },
            update: {}
        })
    },

    async isLessonComplete(enrollment_id: string, lesson_id: string) {
        const record = await prisma.lessonProgress.findUnique({
            where: {
                enrollment_id_lesson_id: { enrollment_id, lesson_id }
            },
        });
        return !!record;
    },

    async getCompletedLessonIds(enrollment_id:string, lesson_id: string) {
        const records = await prisma.lessonProgress.findMany({
            where: { enrollment_id },
            select: { lesson_id: true }
        });
        return records.map((r) => r.lesson_id);
    },

    async count(enrollment_id: string) {
        return prisma.lessonProgress.count({
            where: {enrollment_id},
        });
    },

    async remove(enrollment_id: string, lesson_id: string) {
        return prisma.lessonProgress.deleteMany({
            where: {
                enrollment_id, lesson_id
            },
        });
    }
}
