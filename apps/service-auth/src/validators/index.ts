import { NextFunction, Request, Response } from "express";
import { AnyZodObject } from "zod";
import logger from "../config/logger.config";

export const validateRequestBody = (schema: AnyZodObject) => {
    return async(req: Request, res: Response, next: NextFunction) => {
         console.log("RAW BODY:", req.body);
        try{
            logger.info("Validating request body");
            await schema.parseAsync(req.body);
            console.log("Request body is valid");
            next();
        }catch(error){
            logger.error("Request body validation failed");
            res.status(400).json({
                message: "Invalid request body",
                success: false,
                error: error
            });
        }
    }
}