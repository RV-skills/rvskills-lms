import { InternalServerError } from "@rv-lms/shared-utils";

const SERVICE_ENROLLMENT_URL = process.env.SERVICE_ENROLLMENT_URL!;

interface EnrollmentRecord {
    enrollment_id: string;
    course_id: string;
    status: "ACTIVE" | "COMPLETED" | "DROPPED";
}

export const enrollmentServiceClient = {
    async isEnrolledInCourse(course_id: string, authHeader: string): Promise<boolean> {
        const response = await fetch(`${SERVICE_ENROLLMENT_URL}/api/v1/enrollments/my-enrollments`, {
            headers: { Authorization: authHeader },
        });

        if (!response.ok) {
            throw new InternalServerError("Failed to verify enrollment with service-enrollment");
        }

        const body = (await response.json()) as { success: boolean; data: EnrollmentRecord[] };
        return body.data.some(
            (e) => e.course_id === course_id && e.status !== "DROPPED"
        );
    },
};