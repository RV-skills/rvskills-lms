import { Request, Response } from "express";
import { lessonProgressService } from "../services/lesson-progress.service";
import { catchAsync } from "../utils/catch-async";
import { UuidSchema } from "../validators/lesson-progress.validator";

export const markLessonComplete = catchAsync(async (req: Request, res: Response) => {
    const enrollment_id = UuidSchema.parse(req.params.enrollment_id);
    const lesson_id = UuidSchema.parse(req.params.lesson_id);

    const result = await lessonProgressService.markLessonComplete(enrollment_id, lesson_id);
    res.status(200).json({
        success: true,
        message: "Lesson marked complete",
        data: result,
    });
});