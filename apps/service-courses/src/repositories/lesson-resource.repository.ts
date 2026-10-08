import { prisma } from "../db/prisma";
import { ContentType } from "../generated/prisma/enums";

export const lessonResourceRepository = {
    async findByLesson(lesson_id: string) {
        return prisma.lessonResource.findMany({
            where: { lesson_id },
            orderBy: { order_index: "asc" },
        });
    },

     async create(data: {
        lesson_id: string;
        title: string;
        resource_type: ContentType;
        file_url: string;
        order_index?: number;
    }) {
        return prisma.lessonResource.create({ data });
    },

    async update(
        resource_id: string,
        data: { title?: string; resource_type?: ContentType; file_url?: string; order_index?: number }
    ) {
        return prisma.lessonResource.update({ where: { resource_id }, data });
    },


    async removeFromLesson(lesson_id: string, resource_id: string) {
        const result = await prisma.lessonResource.deleteMany({ where: { resource_id, lesson_id } });
        return result.count;
    },
};