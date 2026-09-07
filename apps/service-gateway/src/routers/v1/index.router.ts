import { Router } from "express";
import testRouter from "./test.router";
import authRouter from "./auth.router";
import usersRouter from "./users.router";
import coursesRouter from "./courses.router";
const v1Router: Router = Router();

v1Router.use("/test", testRouter);
v1Router.use("/auth", authRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/courses", coursesRouter);

export default v1Router;