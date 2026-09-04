import { Router } from 'express';
import { getUsersByIds } from '../../controllers/user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const usersRouter: Router = Router();

usersRouter.get('/', authMiddleware, getUsersByIds);

export default usersRouter;