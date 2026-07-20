import { Request, Response } from "express";
import { catchAsync } from "../utils/catch-async";
import { lessonService } from "../services/lesson.service";
import { CreateLessonSchema, UpdateLessonSchema } from "../validators/lesson.validator";

export const createLesson = catchAsync(async (req: Request, res: Response) => {
  const module_id = req.params.module_id as string;
  const validatedData = CreateLessonSchema.parse(req.body);

  const lesson = await lessonService.createLesson({
    ...validatedData,
    module_id,
  });

  res.status(201).json({
    success: true,
    message: "Lesson created successfully",
    data: lesson,
  });
});

export const getLesson = catchAsync(async (req: Request, res: Response) => {
  const lesson_id = req.params.lesson_id as string;

  const lesson = await lessonService.getLesson(lesson_id);

  res.status(200).json({
    success: true,
    data: lesson,
  });
});

export const listLessons = catchAsync(async (req: Request, res: Response) => {
  const module_id = req.params.module_id as string;

  const lessons = await lessonService.listLessons(module_id);

  res.status(200).json({
    success: true,
    data: lessons,
  });
});

export const updateLesson = catchAsync(async (req: Request, res: Response) => {
  const lesson_id = req.params.lesson_id as string;
  const validatedData = UpdateLessonSchema.parse(req.body);

  const lesson = await lessonService.updateLesson(lesson_id, validatedData as any);

  res.status(200).json({
    success: true,
    message: "Lesson updated successfully",
    data: lesson,
  });
});

export const deleteLesson = catchAsync(async (req: Request, res: Response) => {
  const lesson_id = req.params.lesson_id as string;

  await lessonService.deleteLesson(lesson_id);

  res.status(200).json({
    success: true,
    message: "Lesson deleted successfully",
  });
});