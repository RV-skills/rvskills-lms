import { prisma } from "../db/prisma";
import { CourseStatus } from "../generated/prisma/enums";

export interface CreateCourseInput {
    tenant_id: string;
    title: string;
    description?: string;
    thumbnail_url?: string;
    language?: string;
    difficulty?: string;
}

export interface UpdateCourseInput {
    title?: string;
    description?: string;
    thumbnail_url?: string;
    language?: string;
    difficulty?: string;
}

export const courseRepository = {

    async findById(course_id: string, tenant_id: string) {
        return prisma.course.findFirst({
            where: {
                course_id,
                tenant_id,
                deleted_at: null,
            },
        });
    },

    async findAll(tenant_id: string, filters?: {
        status?: CourseStatus;
        difficulty?: string;
        is_published?: boolean;
    }) {
        return prisma.course.findMany({
            where: {
                tenant_id,
                deleted_at: null,
                ...(filters?.status && { status: filters.status }),
                ...(filters?.difficulty && { difficulty: filters.difficulty }),
                ...(filters?.is_published !== undefined && { is_published: filters.is_published }),
            },
            orderBy: { created_at: "desc" },
        });
    },

    async findWithDetails(course_id: string, tenant_id: string) {
        return prisma.course.findFirst({
            where: {
                course_id,
                tenant_id,
                deleted_at: null,
            },
            include: {
                faculty: true,
                modules: {
                    where: { deleted_at: null },
                    orderBy: { order_index: "asc" },
                    include: {
                        lessons: {
                            where:{ deleted_at: null },
                            orderBy: { order_index: "asc" },
                        },
                    },
                },
            },
        });
    },

    async create(data: CreateCourseInput){
        return prisma.course.create({
            data,
        });
    },

    async update(course_id: string, tenant_id:string, data: UpdateCourseInput){
        return prisma.course.updateMany({
            where: { course_id ,tenant_id},
            data,
        });
    },

    async publish(course_id: string, tenant_id: string) {
        return prisma.course.updateMany({
            where: { course_id },
            data: {
                is_published: true,
                status: CourseStatus.PUBLISHED,
                published_at: new Date(),
            },
        });
    },

    async unpublish(course_id: string, tenant_id: string){
        return prisma.course.updateMany({
            where: { course_id },
            data: {
                is_published: false,
                status: CourseStatus.DRAFT,
            },
        });
    },

    async softDelete(course_id: string, tenant_id: string) {
        return prisma.course.update({
            where: { course_id },
            data: {
                deleted_at: new Date(),
                is_published: false,
                status: CourseStatus.ARCHIVED,
            },
        });
    },
};
