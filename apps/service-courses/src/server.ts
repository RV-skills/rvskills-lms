import express, { Application } from 'express';
import * as dotenv from "dotenv";
import path from "path";
dotenv.config({ path: path.resolve(__dirname, "../.env") });

import courseRouter from "./routers/course.router";

const app: Application = express();
const PORT = process.env.PORT || 3002;

app.use(express.json());
app.use("/api/v1/courses", courseRouter);

app.listen(PORT, () => {
  console.log(`service-courses running on http://localhost:${PORT}`);
});

export default app;