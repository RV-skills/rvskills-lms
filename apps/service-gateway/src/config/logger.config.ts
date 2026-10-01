import winston from "winston";
import { getCorrelationId } from "../utils/helpers/request.helpers";
import DailyRotateFile from "winston-daily-rotate-file";

// File-based rotating logs only make sense with a real, persistent
// filesystem to write to. In ECS, the container's filesystem is
// ephemeral (gone on every restart anyway) and often not writable by
// the non-root user these containers run as -- CloudWatch already
// captures everything from the Console transport below via the awslogs
// driver, making file logs both broken and redundant there. Kept for
// local development, where a real logs/ directory the user owns is a
// reasonable, genuinely useful thing to have.
const transports: winston.transport[] = [new winston.transports.Console()];

if (process.env.NODE_ENV !== "production") {
    transports.push(
        new DailyRotateFile({
            filename: 'logs/%DATE%-app.log',
            datePattern: 'YYYY-MM-DD',
            maxFiles: '14d'
        })
    );
}

const logger = winston.createLogger({
    format: winston.format.combine(
        winston.format.timestamp({ format: "MM-DD-YYYY HH:mm:ss" }),
        winston.format.json(),
        winston.format.printf(({ level, message, timestamp, ...data }) => {
            const output = {
                level,
                message,
                timestamp,
                correlationId: getCorrelationId(),
                data
            };
            return JSON.stringify(output);
        })
    ),
    transports
});

export default logger;
