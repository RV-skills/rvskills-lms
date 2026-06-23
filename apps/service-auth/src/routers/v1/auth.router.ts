import { Router } from 'express';
import { register, login, logout, refresh, getProfile, adminOnlyTest} from '../../controllers/user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const authRouter: Router = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/refresh', refresh);
authRouter.get('/me', authMiddleware, getProfile);
authRouter.get('/admin-test', authMiddleware, requirePermission("user:write"), adminOnlyTest);
export default authRouter;