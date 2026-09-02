import { NextFunction, Request, Response } from "express";
import { AppError } from "@rv-lms/shared-utils";
import { ZodError } from "zod";

export const appErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: err.errors.map((e) => ({
        field: e.path.join('.'),
        message: e.message,
      })),
    });
    return;
  }

  if (err instanceof AppError) {
    console.log(err);
    res.status(err.statusCode).json({
      success: false,
      message: err.message,
    });
    return;
  }

  next(err);
};

export const genericErrorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.log(err);
  res.status(500).json({
    success: false,
    message: "Internal Server Error",
  });
};