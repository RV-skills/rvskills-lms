import { Request, Response } from "express";
import { catchAsync } from "../utils/catch-async";
import { batchService } from "../services/batch.service";
import {
    CreateBatchSchema,
    UpdateBatchSchema,
    ModuleDateSchema,
    EnrollmentBatchSchema,
} from "../validators/batch.validator";

const DEFAULT_TENANT_ID = "rv-skills-tenant";

export const listBatches = catchAsync(async (req: Request, res: Response) => {
    const batches = await batchService.list(req.params.course_id as string, DEFAULT_TENANT_ID);
    res.status(200).json({ success: true, data: batches });
});

export const createBatch = catchAsync(async (req: Request, res: Response) => {
    const input = CreateBatchSchema.parse(req.body);
    const batch = await batchService.create(req.params.course_id as string, DEFAULT_TENANT_ID, input);
    res.status(201).json({ success: true, message: "Batch created", data: batch });
});

export const updateBatch = catchAsync(async (req: Request, res: Response) => {
    const input = UpdateBatchSchema.parse(req.body);
    const batch = await batchService.update(req.params.course_id as string, req.params.batch_id as string, input);
    res.status(200).json({ success: true, message: "Batch updated", data: batch });
});

export const deleteBatch = catchAsync(async (req: Request, res: Response) => {
    await batchService.remove(req.params.course_id as string, req.params.batch_id as string);
    res.status(200).json({ success: true, message: "Batch deleted" });
});

export const setModuleDate = catchAsync(async (req: Request, res: Response) => {
    const { unlock_date } = ModuleDateSchema.parse(req.body);
    const batch = await batchService.setModuleDate(
        req.params.course_id as string,
        req.params.batch_id as string,
        req.params.module_id as string,
        unlock_date,
        req.headers.authorization as string
    );
    res.status(200).json({ success: true, data: batch });
});

export const clearModuleDate = catchAsync(async (req: Request, res: Response) => {
    const batch = await batchService.clearModuleDate(
        req.params.course_id as string,
        req.params.batch_id as string,
        req.params.module_id as string
    );
    res.status(200).json({ success: true, data: batch });
});

export const getRoster = catchAsync(async (req: Request, res: Response) => {
    const roster = await batchService.roster(req.params.course_id as string, DEFAULT_TENANT_ID);
    res.status(200).json({ success: true, data: roster });
});

export const setEnrollmentBatch = catchAsync(async (req: Request, res: Response) => {
    const { batch_id } = EnrollmentBatchSchema.parse(req.body);
    const result = await batchService.setEnrollmentBatch(
        req.params.course_id as string,
        req.params.enrollment_id as string,
        batch_id
    );
    res.status(200).json({ success: true, data: result });
});
