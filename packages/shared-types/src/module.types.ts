import { LessonDTO } from "./lesson.types";

export interface ModuleDTO {
    module_id: string;
    course_id: string;
    title: string;
    description: string | null;
    order_index: number;
    is_locked: boolean;
    created_at: Date;
    updated_at: Date;
    lessons: LessonDTO[];
}