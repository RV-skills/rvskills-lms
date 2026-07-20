import { CourseDTO } from "@rv-lms/shared-types";
import { courseRepository, CreateCourseInput, UpdateCourseInput } from "../repositories/course.repository";
import { NotFoundError } from "@rv-lms/shared-utils";

const DEFAULT_TENANT_ID = "rv-skills-tenant";

const mapToCourseDTO = (course: any): CourseDTO => ({
    course_id: course.course_id,
    tenant_id: course.tenant_id,
    title: course.title,
    description: course.description,
    thumbnail_url: course.thumbnail_url,
    language:  course.language,
    difficulty: course.difficulty,
    status:  course.status,
    is_published: course.is_published,
    published_at: course.published_at,
    created_at: course.created_at,
    updated_at: course.updates_at,
    faculty: course.faculty ?? undefined,
})

export const courseService = {
    async createCourse(data: CreateCourseInput): Promise<CourseDTO> {
        const course = await courseRepository.create(data);
        return mapToCourseDTO(course);
    },

    async getCourse(
        course_id: string,
        tenant_id: string = DEFAULT_TENANT_ID
    ): Promise<CourseDTO> {
        const course = await courseRepository.findById(course_id, tenant_id);

        if(!course) {
            throw new NotFoundError("Course not found");
        }

        return mapToCourseDTO(course);
    },

    async getCourseWithDetails(
        course_id: string,
        tenant_id: string = DEFAULT_TENANT_ID
    ): Promise<CourseDTO> {
        const course = await courseRepository.findWithDetails(course_id, tenant_id);

        if(!course) {
            throw new NotFoundError("Course not found");
        }

        return mapToCourseDTO(course);
    },

    async listCourses(
        tenant_id: string = DEFAULT_TENANT_ID,
        filters?: {
            status?: string;
            difficulty?: string;
            is_published?: boolean;
        }
    ): Promise<CourseDTO[]> {
        const courses = await courseRepository.findAll(tenant_id, filters as any);
        return courses.map(mapToCourseDTO);
    },

    async updateCourse(
        course_id: string,
        tenant_id: string = DEFAULT_TENANT_ID,
        data: UpdateCourseInput
    ): Promise<CourseDTO> {
        const existing = await courseRepository.findById(course_id, tenant_id);

        if(!existing) {
            throw new NotFoundError("Course not found");
        }

        await courseRepository.update(course_id, tenant_id, data);

        const updated = await courseRepository.findById(course_id, tenant_id);

        return mapToCourseDTO(updated);
    },

    async publishCourse(
        course_id: string,
        tenant_id: string = DEFAULT_TENANT_ID
    ): Promise<void> {
        const existing = await courseRepository.findById(course_id, tenant_id);

        if(!existing) {
            throw new NotFoundError("Course not found");
        }

        await courseRepository.publish(course_id, tenant_id);
    },

    async unpublishCourse(
        course_id: string,
        tenant_id: string = DEFAULT_TENANT_ID
    ): Promise<void> {
        const existing = await courseRepository.findById(course_id, tenant_id);

        if(!existing) {
            throw new NotFoundError("Course not found");
        }

        await courseRepository.unpublish(course_id, tenant_id);
    },

    async deleteCourse(
        course_id: string,
        tenant_id: string = DEFAULT_TENANT_ID
    ): Promise<void> {
        const existing = await courseRepository.findById(course_id, tenant_id);

        if(!existing) {
            throw new NotFoundError("Course not found");
        }

        await courseRepository.softDelete(course_id, tenant_id);
    },
}