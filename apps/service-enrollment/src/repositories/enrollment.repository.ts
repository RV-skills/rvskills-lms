import { prisma } from "../db/prisma";
import { EnrollmentStatus } from "../generated/prisma/enums";

export const enrollmentRepository = {
    async create(data: {
        student_id: string,
        course_id: string,
        tenant_id: string
    }) {
        return prisma.enrollment.create({
            data,
        });
    },

    async findById(enrollment_id: string) {
        return prisma.enrollment.findUnique({
            where: { enrollment_id },
        });
    },

    async findByStudentAndCourse(student_id: string, course_id: string) {
        return prisma.enrollment.findUnique({
            where: {
                student_id_course_id: { student_id, course_id}
            },
        });
    },
    
    async findByStudent(student_id: string, tenant_id: string) {
        return prisma.enrollment.findMany({
            where: { student_id, tenant_id },
        });
    },

    async findByCourse(course_id: string, tenant_id: string) {
        return prisma.enrollment.findMany({
            where: { course_id, tenant_id },
        });
    },

    async markCompleted(enrollment_id: string) {
        return prisma.enrollment.update({
            where: { enrollment_id },
            data: {
                status: EnrollmentStatus.COMPLETED,
                completed_at: new Date(),
            },
        });
    },

    async markDropped(enrollment_id: string) {
        return prisma.enrollment.update({
            where: { enrollment_id },
            data: {
                status: EnrollmentStatus.DROPPED,
                dropped_at: new Date(),
            },
        });
    },

    async count(course_id: string) {
        return prisma.enrollment.count({
            where: { course_id, status: EnrollmentStatus.ACTIVE  },
        });
    },
}