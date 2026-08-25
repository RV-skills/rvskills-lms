import { Request, Response } from "express";
import { enrollmentService } from "../services/enrollment.service";
import { catchAsync } from "../utils/catch-async";
import { EnrollCourseSchema, BulkEnrollCourseSchema } from "../validators/enrollment.validator";

const DEFAULT_TENANT_ID = "rv-skills-tenant";

export const enrollCourse = catchAsync(async (req: Request, res: Response) => {
    const { student_id, course_id } = EnrollCourseSchema.parse(req.body);
    const enrollment = await enrollmentService.enrollCourse(student_id, course_id, DEFAULT_TENANT_ID);
    res.status(201).json({
        success: true,
        message: "Enrolled successfully",
        data: enrollment
    });
});

export const bulkEnrollCourse = catchAsync(async (req: Request, res: Response) => {
    const { course_id, students } = BulkEnrollCourseSchema.parse(req.body);
    const studentsWithTenant = students.map((s) => ({ ...s, tenant_id: DEFAULT_TENANT_ID}));
    const result = await enrollmentService.bulkEnrollCourse(studentsWithTenant, course_id);
    res.status(201).json({
        success: true,
        message: "Bulk enrollment processed",
        data: result
    });
});

export const dropCourse = catchAsync(async (req: Request, res: Response) => {
    const enrollment_id = req.params.enrollment_id as string;
    const enrollment = await enrollmentService.dropCourse(enrollment_id);
    res.status(200).json({
        success: true,
        message: "Enrollment dropped successfully",
        data: enrollment
    });
});

export const getEnrollment = catchAsync(async (req: Request, res: Response) => {
    const enrollment_id = req.params.enrollment_id as string;
    const enrollment = await enrollmentService.getEnrollment(enrollment_id);
    res.status(200).json({
        success: true,
        data: enrollment,
    });
});