import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  meController,
  listAllUsersController,
  listAllRolesController,
  assignRoleController,
  removeRoleController,
  adminCreateUserController,
  adminBatchCreateStudentsController,
} from "../../controllers/users.controller";

const usersRouter: Router = Router();

usersRouter.get("/me", authMiddleware, meController);
usersRouter.get("/all", authMiddleware, listAllUsersController);
usersRouter.get("/roles", authMiddleware, listAllRolesController);
usersRouter.post("/:user_id/roles", authMiddleware, assignRoleController);
usersRouter.delete("/:user_id/roles/:role_id", authMiddleware, removeRoleController);
usersRouter.post("/", authMiddleware, adminCreateUserController);
usersRouter.post("/batch", authMiddleware, adminBatchCreateStudentsController);

export default usersRouter;
