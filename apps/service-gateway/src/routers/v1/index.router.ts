import { Router } from "express";
import testRouter from "./test.router";

const v1Router: Router = Router();

v1Router.use("/test", testRouter);

export default v1Router;