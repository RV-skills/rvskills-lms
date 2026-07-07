import { prisma } from "../db/prisma";
import { ContentType } from "../generated/prisma/enums";

export interface CreateLessonInput {
    module_id: string;
    title: string;
    content_type: ContentType;
    order_index: number;
    is_preview?: boolean;
    estimated_duration_mins?: number;
}

export interface UpdateLessonInput {
    title?: string;
    content_type?: ContentType;
    order_index?: number;
    is_preview?: boolean;
    estimated_duration_mins?: number;
}

export const lessonRepository = {
    
    async findById(lesson_id: string) {
        return prisma.lesson.findFirst({
            where: { lesson_id, deleted_At: null },
        });
    },

    async findByModule(module_id: string) {
        return prisma.lesson.findMany({
            where: { module_id, deleted_At: null },
            orderBy: { order_index: "asc"},
        });
    },

    async findWithContent(lesson_id: string) {
        return prisma.lesson.findFirst({
            where: { lesson_id, deleted_At: null },
            include: { content_metadata: true }
        });
    },

    async create(data: CreateLessonInput) {
        return prisma.lesson.create({ data });
    },

    async update(lesson_id: string, data: UpdateLessonInput) {
        return prisma.lesson.update({
            where: { lesson_id },
            data,
        });
    },

    async softDetele(lesson_id: string) {
        return prisma.lesson.update({
            where: { lesson_id },
            data: { deleted_At: new Date() },
        });
    },

    async getNextOrderIndex(module_id: string) {
        const last = await prisma.lesson.findFirst({
            where: { module_id, deleted_At: null },
            orderBy:{ order_index: "desc" },
        });
        return last ? last.order_index + 1 : 1;
    },
};