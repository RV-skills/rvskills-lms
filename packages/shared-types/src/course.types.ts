import { ModuleDTO } from './module.types';

export interface CourseFacultyDTO {
    course_id: string;
    faculty_id: string;
    role: string;
    created_at: string;
}

export interface CourseDTO {
    course_id: string;
    tenant_id: string;
    title: string;
    description: string | null;
    thumbnail_url: string | null;
    language: string;
    difficulty: string;
    status: string;
    is_published: boolean;
    published_at: Date | null;
    created_at: Date;
    updated_at: Date;
    faculty?: CourseFacultyDTO[];
    modules?: ModuleDTO[];
}