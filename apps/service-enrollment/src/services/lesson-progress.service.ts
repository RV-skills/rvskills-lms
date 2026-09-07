import  { prisma } from "../db/prisma";
import { lessonProgressRepository } from "../repositories/lesson-progress.repository";
import { enrollmentRepository } from "../repositories/enrollment.repository";
import { courseServiceClient } from "../clients/course-service.client";
import { NotFoundError, ValidationError, ForbiddenError } from "@rv-lms/shared-utils";
import { EnrollmentStatus } from "../generated/prisma/enums";

const courseLessonCountCache = new Map<string, {count: number; expiresAt: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000;

async function getTotalLessonCount(course_id: string): Promise<number> {
    const cached = courseLessonCountCache.get(course_id);
    const now = Date.now();

    if(cached && cached.expiresAt > now) {
        return cached.count;
    }

    const course = await courseServiceClient.getCourse(course_id);
    const count = course.modules? course.modules.flatMap((m) => m.lessons).length : 0;

    courseLessonCountCache.set(course_id, { count, expiresAt: now + CACHE_TTL_MS });
    return count;
}

export const lessonProgressService = {
    async getProgress(enrollment_id: string, course_id: string) {
        const totalLessons = await getTotalLessonCount(course_id);
        const completedCount = await lessonProgressRepository.count(enrollment_id);
        return { completedCount, totalLessons };
    },

    async markLessonComplete(enrollment_id: string, lesson_id: string, student_id: string) {
        const enrollment = await enrollmentRepository.findById(enrollment_id);

        if(!enrollment) {
            throw new NotFoundError("Enrollment not found");
        }
        if(enrollment.student_id !== student_id) {
            throw new ForbiddenError("You do not have permission to update this enrollment");
        }
        if(enrollment.status !== EnrollmentStatus.ACTIVE) {
            throw new ValidationError("Cannot update progress on an inactive enrollment");
        }

        await lessonProgressRepository.markComplete(enrollment_id, lesson_id);

        const { completedCount, totalLessons } = await lessonProgressService.getProgress(enrollment_id, enrollment.course_id);

        if(totalLessons > 0 && completedCount >= totalLessons) {
            await enrollmentRepository.markCompleted(enrollment_id);
        }

        return { completedCount, totalLessons };
    }
}