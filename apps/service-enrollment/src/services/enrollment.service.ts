import { prisma } from "../db/prisma";
import { enrollmentRepository } from "../repositories/enrollment.repository";
import { courseServiceClient } from "../clients/course-service.client";
import { ConflictError, NotFoundError, ValidationError } from "@rv-lms/shared-utils";
import { EnrollmentStatus } from "../generated/prisma/enums";

export const enrollmentService = {
    async enrollCourse(student_id: string, course_id:string, tenant_id:string) {
        const course = await courseServiceClient.getCourse(course_id);

        if(!course.is_published) {
            throw new ValidationError("Course is not open for enrollment");
        }

        const existing = await enrollmentRepository.findByStudentAndCourse(student_id, course_id);
        if(existing) {
            throw new ConflictError("Student is already enrolled in this course");
        }

        return prisma.$transaction(async (tx) => {
            await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${course_id}))`;

            if(course.max_seats !== null) {
                const enrolledCount = await enrollmentRepository.count(course_id, tx);
                
                if(enrolledCount >= course.max_seats) {
                    throw new ConflictError("Course is full");
                }
            }

            return enrollmentRepository.create({ student_id, course_id, tenant_id}, tx);
        });
    },

    async bulkEnrollCourse(
        students: { student_id: string, tenant_id: string}[],
        course_id: string
    ) {
        const course = await courseServiceClient.getCourse(course_id);

        if (!course.is_published) {
            throw new ValidationError("Course is not open for enrollment");
        }

        const entries = students.map((s) => ({
            student_id: s.student_id,
            course_id,
            tenant_id: s.student_id
        }));

        const result = await enrollmentRepository.createMany(entries);

        return {
            requested: students.length,
            enrolled: result.count,
            skipped: students.length - result.count,
        }
    },

    async dropCourse(enrollment_id: string) {
        const enrollment = await enrollmentRepository.findById(enrollment_id);

        if(!enrollment) {
            throw new NotFoundError("Enrollment not found");
        }

        if(enrollment.status !== EnrollmentStatus.ACTIVE) {
            throw new ValidationError("Only active enrollments can be dropped");
        }

        return enrollmentRepository.markDropped(enrollment_id);
    }
};