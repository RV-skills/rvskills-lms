import { Request, Response } from "express";
import { catchAsync } from "../utils/catch-async";
import { moduleService } from "../services/module.service";
import { CreateModuleSchema, UpdateModuleSchema } from "../validators/module.validatior";

export const createModule = catchAsync(async (req: Request, res: Response) => {
  const course_id = req.params.course_id as string;
  const validatedData = CreateModuleSchema.parse(req.body);

  const module = await moduleService.createModule({
    ...validatedData as any,
    course_id,
  });

  res.status(201).json({
    success: true,
    message: "Module created successfully",
    data: module,
  });
});

export const getModule = catchAsync(async (req: Request, res: Response) => {
  const module_id = req.params.module_id as string;

  const module = await moduleService.getModule(module_id);

  res.status(200).json({
    success: true,
    data: module,
  });
});

export const listModules = catchAsync(async (req: Request, res: Response) => {
  const course_id = req.params.course_id as string;

  const modules = await moduleService.listModules(course_id);

  res.status(200).json({
    success: true,
    data: modules,
  });
});

export const updateModule = catchAsync(async (req: Request, res: Response) => {
  const module_id = req.params.module_id as string;
  const validatedData = UpdateModuleSchema.parse(req.body);

  const module = await moduleService.updateModule(module_id, validatedData as any);

  res.status(200).json({
    success: true,
    message: "Module updated successfully",
    data: module,
  });
});

export const deleteModule = catchAsync(async (req: Request, res: Response) => {
  const module_id = req.params.module_id as string;

  await moduleService.deleteModule(module_id);

  res.status(200).json({
    success: true,
    message: "Module deleted successfully",
  });
});