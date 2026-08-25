import express, { Application } from 'express';
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import enrollmentRouter from "./routers/enrollment.router";
import { appErrorHandler, genericErrorHandler } from './middlewares/error.middleware';
import { requestLoggerMiddleware } from './middlewares/request-logger.middleware';

const app: Application = express();
const PORT = process.env.PORT || 3003;

app.use(express.json());
app.use(requestLoggerMiddleware);
app.use("/api/v1/enrollments", enrollmentRouter);
app.use(appErrorHandler);
app.use(genericErrorHandler);

app.listen(PORT, () => {
  console.log(`service-enrollment running on http://localhost:${PORT}`);
});

export default app;