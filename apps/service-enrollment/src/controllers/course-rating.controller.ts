import { Request, Response } from "express";
import { courseRatingService } from "../services/course-rating.service";
import { catchAsync } from "../utils/catch-async";
import { SubmitRatingSchema, UpdateRatingSchema } from "../validators/course-rating.validator";

const DEFAULT_TENANT_ID = "rv-skills-tenant";

export const submitRating = catchAsync(async (req: Request, res: Response) => {
    const enrollment_id = req.params.enrollment_id as string;
    const { stars, comment } = SubmitRatingSchema.parse(req.body);
    const rating = await courseRatingService.submitRating(enrollment_id, stars, comment);
    res.status(201).json({
        success: true,
        message: "Rating submitted successfully",
        data: rating,
    });
});

export const updateRating = catchAsync(async (req: Request, res: Response) => {
    const enrollment_id = req.params.enrollment_id as string;
    const data = UpdateRatingSchema.parse(req.body);
    const rating = await courseRatingService.updateRating(enrollment_id, data);
    res.status(200).json({
        success: true,
        data: rating,
    });
});

export const listCourseRatings = catchAsync(async (req: Request, res: Response) => {
    const course_id =  req.params.course_id as string;
    const ratings = await courseRatingService.getCourseRatings(course_id, DEFAULT_TENANT_ID);
    res.status(200).json({
        success: true,
        data: ratings,
    });
});

export const getAverageRating = catchAsync(async (req: Request, res: Response) => {
    const course_id = req.params.course_id as string;
    const result = await courseRatingService.getAverageRating(course_id);
    res.status(200).json({
        success: true,
        data: result,
    });
});