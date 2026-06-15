export interface IAppError {
    message: string;
    statusCode: number;
    isOperational: boolean;
    stack?: string;
}

export class AppError extends Error implements IAppError {
    public readonly statusCode: number;
    public readonly isOperational: boolean;

    constructor(
        message: string,  
        statusCode: number,
        isOperational: boolean = true
    ){
        super(message);
        this.statusCode = statusCode;
        this.isOperational = isOperational;

        Object.setPrototypeOf(this, AppError.prototype);
        Error.captureStackTrace(this, this.constructor);
    }
}

export class UnauthorizedError extends AppError {
    constructor(
        message: string = "Unauthorized"
    ){
        super(message, 401);
        Object.setPrototypeOf(this, UnauthorizedError.prototype);
    }
}

export class ValidationError extends AppError {
    constructor(
        message: string = "Validation failed"
    ){
        super(message, 400);
        Object.setPrototypeOf(this, ValidationError.prototype);
    }
}

export class ForbiddenError extends AppError {
    constructor(
        message: string = "Forbidden"
    ){
        super(message, 403);
        Object.setPrototypeOf(this, ForbiddenError.prototype);
    }
}

export class NotFoundError extends AppError {
    constructor(
        message: string = "Resource not found"
    ){
        super(message, 404);
        Object.setPrototypeOf(this, NotFoundError.prototype);
    }
}

export class ConflictError extends AppError {
    constructor(
        message: string = "Resource already exists"
    ){
        super(message, 409);
        Object.setPrototypeOf(this, ConflictError.prototype);
    }
}

export class InternalServerError extends AppError {
    constructor(
        message: string = "Internal server error"
    ){
        super(message, 500, false);
        Object.setPrototypeOf(this, InternalServerError.prototype);
    }
}



