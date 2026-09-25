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

export const setVideoUrl = catchAsync(async (req: Request, res: Response) => {
  const lesson_id = req.params.lesson_id as string;
  const { video_url } = req.body as { video_url: string };
  const lesson = await lessonService.setVideoUrl(lesson_id, video_url);
  res.status(200).json({ success: true, data: lesson });
});

export const removeVideo = catchAsync(async (req: Request, res: Response) => {
  const lesson_id = req.params.lesson_id as string;
  const lesson = await lessonService.removeVideo(lesson_id);
  res.status(200).json({ success: true, data: lesson });
});

export const addResource = catchAsync(async (req: Request, res: Response) => {
  const lesson_id = req.params.lesson_id as string;
  const { title, pdf_url } = req.body as { title: string; pdf_url: string };
  const lesson = await lessonService.addResource(lesson_id, title, pdf_url);
  res.status(201).json({ success: true, data: lesson });
});

export const removeResource = catchAsync(async (req: Request, res: Response) => {
  const lesson_id = req.params.lesson_id as string;
  const resource_id = req.params.resource_id as string;
  const lesson = await lessonService.removeResource(lesson_id, resource_id);
  res.status(200).json({ success: true, data: lesson });
});