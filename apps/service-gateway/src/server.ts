import express from "express";
import cookieParser from "cookie-parser";
import cors from "cors";
import { serverConfig } from "./config";
import { appErrorHandler, genericErrorHandler } from "./middlewares/error.middleware";
import logger from "./config/logger.config";
import { attachCorrelationIdMiddleware } from "./middlewares/correlation.middleware";
import { requestLoggerMiddleware } from "./middlewares/request.logger.middleware";
import v1Router from "./routers/v1/index.router";

const app = express();

app.use(express.json());
app.use(cookieParser(serverConfig.COOKIE_SECRET));
app.use(
  cors({
    origin: serverConfig.CORS_ORIGIN,
    credentials: true,
  })
);

app.use(attachCorrelationIdMiddleware);
app.use(requestLoggerMiddleware);

app.use("/api/v1", v1Router);

app.use(appErrorHandler);
app.use(genericErrorHandler);

app.listen(serverConfig.PORT, () => {
  logger.info(`Server is running on http://localhost:${serverConfig.PORT}`);
  logger.info(`Press Ctrl+C to stop the server.`);
});