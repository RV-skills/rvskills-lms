import {Request, Response} from "express";
import { courseService } from "../services/course.service";
import { catchAsync } from "../utils/catch-async";
import { CreateCourseSchema, UpdateCourseSchema } from "../validators/course.validator";

const DEFAULT_TENANT_ID = "rv-skills-tenant";

export const createCourse = catchAsync(async (req: Request, res: Response) => {
    const validatedData = CreateCourseSchema.parse(req.body);

    const course = await courseService.createCourse({
        ...validatedData,
        tenant_id: DEFAULT_TENANT_ID,
    });

    res.status(201).json({
    success: true,
    message: "Course created successfully",
    data: course,
  });
});

export const getCourse = catchAsync(async (req: Request, res:Response) => {
    const course_id = req.params.course_id as string;

    const course = await courseService.getCourseWithDetails(course_id, DEFAULT_TENANT_ID);

    res.status(200).json({
        success: true,
        data: course,
    });
});

export const listCourses = catchAsync(async (req: Request, res: Response) => {
    const { status, difficulty, is_published } = req.query;

    const courses = await courseService.listCourses(DEFAULT_TENANT_ID, {
        status: status as string | undefined,
        difficulty: difficulty as string | undefined,
        is_published: is_published !== undefined ? is_published === "true" : undefined,
    });

    res.status(200).json({
        success: true,
        data: courses,
    });
});

export const updateCourse = catchAsync(async (req: Request, res: Response) => {
    const course_id = req.params.course_id as string;
    const validatedData = UpdateCourseSchema.parse(req.body);

    const course = await courseService.updateCourse(course_id, DEFAULT_TENANT_ID,  validatedData as any);

    res.status(200).json({
        success: true,
        message: "Course updated successfully",
        data: course,
    });
});

export const publishCourse = catchAsync(async (req: Request, res: Response) => {
    const course_id = req.params.course_id as string;

    await courseService.publishCourse(course_id, DEFAULT_TENANT_ID);

    res.status(200).json({
        success: true,
        message: "Course published successfully",
    });
});

export const unpublishCourse = catchAsync(async (req: Request, res: Response) => {
    const course_id = req.params.course_id as string;

    await courseService.unpublishCourse(course_id, DEFAULT_TENANT_ID);

    res.status(200).json({
        success: true,
        message: "Course unpublished successfully",
    });
});

export const deleteCourse = catchAsync(async (req: Request, res: Response) => {
    const course_id = req.params.course_id as string;

    await courseService.deleteCourse(course_id, DEFAULT_TENANT_ID);

    res.status(200).json({
        success: true,
        message: "Course deleted successfully",
    });
});
