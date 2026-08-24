import { prisma } from "../db/prisma";
import { EnrollmentStatus } from "../generated/prisma/enums";
import { Prisma } from "../generated/prisma/client";
import { courseServiceClient } from "../clients/course-service.client";
import { ValidationError } from "@rv-lms/shared-utils";

export const enrollmentRepository = {
    async create(
        data: {
        student_id: string,
        course_id: string,
        tenant_id: string
    },
    client: Prisma.TransactionClient  = prisma
    ) {
        return client.enrollment.create({
            data,
        });
    },

    async findById(enrollment_id: string, client: Prisma.TransactionClient = prisma) {
        return client.enrollment.findUnique({
            where: { enrollment_id },
        });
    },

    async findByStudentAndCourse(student_id: string, course_id: string, client: Prisma.TransactionClient = prisma) {
        return client.enrollment.findUnique({
            where: {
                student_id_course_id: { student_id, course_id}
            },
        });
    },
    
    async findByStudent(student_id: string, tenant_id: string, client: Prisma.TransactionClient = prisma) {
        return client.enrollment.findMany({
            where: { student_id, tenant_id },
        });
    },

    async findByCourse(course_id: string, tenant_id: string, client: Prisma.TransactionClient = prisma) {
        return client.enrollment.findMany({
            where: { course_id, tenant_id },
        });
    },

    async markCompleted(enrollment_id: string, client: Prisma.TransactionClient = prisma) {
        return client.enrollment.update({
            where: { enrollment_id },
            data: {
                status: EnrollmentStatus.COMPLETED,
                completed_at: new Date(),
            },
        });
    },

    async markDropped(enrollment_id: string, client: Prisma.TransactionClient = prisma) {
        return client.enrollment.update({
            where: { enrollment_id },
            data: {
                status: EnrollmentStatus.DROPPED,
                dropped_at: new Date(),
            },
        });
    },

    async count(course_id: string, client: Prisma.TransactionClient = prisma) {
        return client.enrollment.count({
            where: { course_id, status: EnrollmentStatus.ACTIVE  },
        });
    },

    async createMany(
        entries: { student_id: string, course_id: string, tenant_id:string }[],
        client: Prisma.TransactionClient = prisma
    ) {
        return client.enrollment.createMany({
            data: entries,
            skipDuplicates: true
        });
    }
}