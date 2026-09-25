import { prisma } from "../db/prisma";

export const lessonResourceRepository = {
    async findByLesson(lesson_id: string) {
        return prisma.lessonResource.findMany({
            where: { lesson_id },
            orderBy: { order_index: "asc" },
        });
    },

    async create(data: { lesson_id: string; title: string; pdf_url: string; order_index?: number }) {
        return prisma.lessonResource.create({ data });
    },

    async update(resource_id: string, data: { title?: string; pdf_url?: string; order_index?: number }) {
        return prisma.lessonResource.update({ where: { resource_id }, data });
    },

    async remove(resource_id: string) {
        return prisma.lessonResource.delete({ where: { resource_id } });
    },
};