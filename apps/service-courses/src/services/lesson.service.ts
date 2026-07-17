import { LessonDTO } from "@rv-lms/shared-types";
import { CreateLessonInput, lessonRepository, UpdateLessonInput } from "../repositories/lesson.repository";
import { NotFoundError } from "@rv-lms/shared-utils";

const mapToLessonDTO = (lesson: any): LessonDTO => ({
    lesson_id: lesson.lesson_id,
    module_id: lesson.module_id,
    title: lesson.title,
    content_type: lesson.content_type,
    order_index: lesson.order_index,
    is_preview: lesson.is_preview,
    estimated_duration_mins: lesson.estimated_duration_mins,
    created_at: lesson.created_at,
    updated_at: lesson.updated_at,
    content_metadata: lesson.content_metadata ?? null,
});

export const lessonService = {

    async createLesson(
        data: Omit<CreateLessonInput, "order_index"> & { order_index?: number }
    ): Promise<LessonDTO> {
        const order_index = data.order_index ??
            await lessonRepository.getNextOrderIndex(data.module_id);
        
        const lesson = await lessonRepository.create({
            ...data,
            order_index,
        });

        return mapToLessonDTO(lesson);
    },

    async getLesson(lesson_id: string): Promise<LessonDTO> {
        const lesson = await lessonRepository.findWithContent(lesson_id);

        if (!lesson) {
        throw new NotFoundError('Lesson not found');
        }

        return mapToLessonDTO(lesson);
    },

    async listLessons(module_id: string): Promise<LessonDTO[]> {
        const lessons = await lessonRepository.findByModule(module_id);
        return lessons.map(mapToLessonDTO);
    },

    async updateLesson(
        lesson_id: string,
        data: UpdateLessonInput
    ): Promise<LessonDTO> {
        const existing = await lessonRepository.findById(lesson_id);

        if (!existing) {
        throw new NotFoundError('Lesson not found');
        }

        await lessonRepository.update(lesson_id, data);

        const updated = await lessonRepository.findWithContent(lesson_id);
        return mapToLessonDTO(updated);
    },

    async deleteLesson(lesson_id: string): Promise<void> {
        const existing = await lessonRepository.findById(lesson_id);

        if (!existing) {
        throw new NotFoundError('Lesson not found');
        }

        await lessonRepository.softDetele(lesson_id);
    },
}