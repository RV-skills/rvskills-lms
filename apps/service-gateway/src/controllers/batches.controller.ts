import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import {
  getCourseSchedule,
  createBatch,
  updateBatch,
  deleteBatch,
  setBatchModuleDate,
  clearBatchModuleDate,
  setStudentBatch,
} from "../services/batches.service";

type Handler = (req: AuthenticatedRequest) => Promise<{ status: number; data?: unknown }>;

function handle(fn: Handler) {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      const { status, data } = await fn(req);
      res.status(status).json({ success: true, ...(data !== undefined ? { data } : {}) });
    } catch (err) {
      next(err);
    }
  };
}

const p = (req: AuthenticatedRequest, key: string) => req.params[key] as string;

export const getCourseScheduleController = handle(async (req) => ({
  status: 200,
  data: await getCourseSchedule(p(req, "course_id"), req.accessToken!),
}));

export const createBatchController = handle(async (req) => ({
  status: 201,
  data: await createBatch(p(req, "course_id"), req.body ?? {}, req.accessToken!),
}));

export const updateBatchController = handle(async (req) => ({
  status: 200,
  data: await updateBatch(p(req, "course_id"), p(req, "batch_id"), req.body ?? {}, req.accessToken!),
}));

export const deleteBatchController = handle(async (req) => {
  await deleteBatch(p(req, "course_id"), p(req, "batch_id"), req.accessToken!);
  return { status: 200 };
});

export const setBatchModuleDateController = handle(async (req) => ({
  status: 200,
  data: await setBatchModuleDate(
    p(req, "course_id"),
    p(req, "batch_id"),
    p(req, "module_id"),
    (req.body as { unlock_date?: string })?.unlock_date ?? "",
    req.accessToken!
  ),
}));

export const clearBatchModuleDateController = handle(async (req) => ({
  status: 200,
  data: await clearBatchModuleDate(p(req, "course_id"), p(req, "batch_id"), p(req, "module_id"), req.accessToken!),
}));

export const setStudentBatchController = handle(async (req) => ({
  status: 200,
  data: await setStudentBatch(
    p(req, "course_id"),
    p(req, "enrollment_id"),
    (req.body as { batch_id?: string | null })?.batch_id ?? null,
    req.accessToken!
  ),
}));
