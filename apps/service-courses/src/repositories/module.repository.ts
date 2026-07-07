import { prisma } from "../db/prisma";

export interface CreateModuleInput {
    course_id: string;
    title: string;
    description?: string;
    order_index: number;
}

export interface UpdateModuleInput {
    title?: string;
    description?: string;
    order_index?: number;
    is_locked?: boolean;
}

export const moduleRepository = {
    
    async findById(module_id: string) {
        return prisma.module.findFirst({
            where: { module_id, deleted_at: null },
        });
    },

    async findByCourse(course_id: string){
        return prisma.module.findMany({
            where: { course_id, deleted_at: null },
            orderBy: { order_index: "asc" },
        });
    },

    async create(data: CreateModuleInput) {
        return prisma.module.create({data});
    },

    async update(module_id: string, data: UpdateModuleInput) {
        return prisma.module.update({
            where: { module_id },
            data,
        });
    },

    async softDelete(module_id: string) {
        return prisma.module.update({
            where: { module_id },
            data: { deleted_at: new Date() },
        });
    },

    async getNextOrderIndex(course_id: string) {
        const last = await prisma.module.findFirst({
            where: { course_id, deleted_at: null},
            orderBy: { order_index: "desc" },
        });
        return last ? last.order_index + 1 : 1;
    },
}