import { CourseDTO } from "@rv-lms/shared-types";
import { NotFoundError, InternalServerError } from "@rv-lms/shared-utils";

const SERVICE_COURSES_URL = process.env.SERVICE_COURSES_URL!;

export const courseServiceClient = {
    async getCourse(course_id: string): Promise<CourseDTO> {
        const response = await fetch(`${SERVICE_COURSES_URL}/api/v1/courses/${course_id}`);

        if (response.status === 404) {
            throw new NotFoundError("Course not found");
        }

        if (!response.ok) {
            throw new InternalServerError("Failed to fetch course from service-courses");
        }

        const body = (await response.json()) as { success: boolean; data: CourseDTO };;
        return body.data as CourseDTO;
    },
};