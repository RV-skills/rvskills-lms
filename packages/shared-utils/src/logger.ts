import winston from "winston";

const  { combine, timestamp, printf, colorize, errors } = winston.format;

const logFormat = printf(({level, message, timestamp, correlationId, stack}) => {
    const correlation = correlationId?  `[${correlationId}]` : "";
    const stackTrace =  stack? `\n${stack}` : "";
    return `${timestamp}${correlation} [${level}]: ${message}${stackTrace}`;
})

const logger  = winston.createLogger({
    level: process.env.NODE_ENV === "production" ? "info" : "debug",
    format: combine(
        errors({ stack: true }),
        timestamp({ format: "YYYY-MM-DD HH:mm:ss"}),
        logFormat
    ),
    transports: [
        new winston.transports.Console({
            format: combine(
                colorize(),
                errors({ stack: true }),
                timestamp({ format: "YYYY-MM-DD HH:mm:ss"}),
                logFormat
            )
        })
    ]
});

export default logger;