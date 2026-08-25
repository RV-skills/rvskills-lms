import { prisma } from "../db/prisma";

export const courseRatingRepository = {
    async create(data: {
        enrollment_id: string;
        course_id: string;
        tenant_id: string;
        stars: number;
        comment?: string;
    }) {
        return prisma.courseRating.create({
            data,
        });
    },

    async findByEnrollment(enrollment_id: string) {
        return prisma.courseRating.findUnique({
            where: { enrollment_id },
        });
    },

    async findByCourse(course_id: string, tenant_id: string) {
        return prisma.courseRating.findMany({
            where: { course_id, tenant_id },
        });
    },

    async update(enrollment_id: string, data: { stars?: number; comment?: string}) {
        return prisma.courseRating.update({
            where: { enrollment_id },
            data,
        });
    },

    async getAverageRating(course_id: string) {
        const result = await prisma.courseRating.aggregate({
            where: { course_id },
            _avg: { stars: true },
            _count: { stars: true },
        });
        return {
            average: result._avg.stars ?? 0,
            count: result._count.stars,
        };
    }
}