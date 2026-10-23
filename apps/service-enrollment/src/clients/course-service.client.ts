import { CourseDTO } from "@rv-lms/shared-types";
import { NotFoundError, InternalServerError, ForbiddenError, UnauthorizedError } from "@rv-lms/shared-utils";

const SERVICE_COURSES_URL = process.env.SERVICE_COURSES_URL!;

export const courseServiceClient = {
    // authorization is the caller's "Bearer ..." header. Without it, draft courses read as 404.
    async getCourse(course_id: string, authorization?: string): Promise<CourseDTO> {
        const response = await fetch(`${SERVICE_COURSES_URL}/api/v1/courses/${course_id}`, {
            headers: authorization ? { Authorization: authorization } : {},
        });

        if (response.status === 404) {
            throw new NotFoundError("Course not found");
        }

        if (!response.ok) {
            throw new InternalServerError("Failed to fetch course from service-courses");
        }

        const body = (await response.json()) as { success: boolean; data: CourseDTO };
        return body.data as CourseDTO;
    },

    // Passes only if the caller may edit the course: an admin, or faculty assigned to it.
    // service-courses already decides this for its faculty list, so we ask it rather than
    // keep a second copy of the rule here.
    async assertCanEdit(course_id: string, authorization: string): Promise<void> {
        const response = await fetch(`${SERVICE_COURSES_URL}/api/v1/courses/${course_id}/faculty`, {
            headers: { Authorization: authorization },
        });

        if (response.ok) return;
        if (response.status === 404) throw new NotFoundError("Course not found");
        if (response.status === 401) throw new UnauthorizedError("Invalid or expired token");
        if (response.status === 403) throw new ForbiddenError("You are not assigned to this course");
        throw new InternalServerError("Failed to check course access with service-courses");
    },
};
