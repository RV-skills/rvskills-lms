import { courseRatingRepository } from "../repositories/course-rating.repository";
import { enrollmentRepository } from "../repositories/enrollment.repository";
import { NotFoundError, ValidationError, ConflictError } from "@rv-lms/shared-utils";
import { EnrollmentStatus } from "../generated/prisma/enums";

export const courseRatingService = {
    async submitRating(enrollment_id: string, stars: number, comment?: string) {
        const enrollment = await enrollmentRepository.findById(enrollment_id);

        if(!enrollment) {
            throw new NotFoundError("Enrollment not found");
        }

        if (enrollment.status !== EnrollmentStatus.COMPLETED) {
            throw new ValidationError("You can only rate a course after completing it");
        }

        const existing = await courseRatingRepository.findByEnrollment(enrollment_id);
        if (existing) {
            throw new ConflictError("You have already rated this course");
        }

        return courseRatingRepository.create({
            enrollment_id,
            course_id: enrollment.course_id,
            tenant_id: enrollment.tenant_id,
            stars,
            comment
        });
    },

    async updateRating(enrollment_id: string, data: { stars?: number; comment?: string }) {
        const existing = await courseRatingRepository.findByEnrollment(enrollment_id);

        if(!existing) {
            throw new NotFoundError("Rating not found")
        }
        return courseRatingRepository.update(enrollment_id, data);
    },

    async getCourseRatings(course_id: string, tenant_id: string) {
        return courseRatingRepository.findByCourse(course_id, tenant_id);

    },
    
    async getAverageRating(course_id: string) {
        return courseRatingRepository.getAverageRating(course_id);
    },
}