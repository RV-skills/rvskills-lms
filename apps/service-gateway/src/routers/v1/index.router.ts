import { Router } from "express";
import testRouter from "./test.router";
import authRouter from "./auth.router";

const v1Router: Router = Router();

v1Router.use("/test", testRouter);
v1Router.use("/auth", authRouter);

export default v1Router;