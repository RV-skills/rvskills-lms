export interface AppError extends Error {
    statusCode: number;
}

export class InternalServerError implements AppError {
    message: string
    statusCode: number
    name: string
   constructor(message: string){
        this.statusCode = 500,
        this.message = message,
        this.name = "InternalServerError"
   }

}