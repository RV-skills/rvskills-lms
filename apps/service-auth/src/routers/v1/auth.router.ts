import { Router } from 'express';
import { register, login, logout, refresh, getProfile} from '../../controllers/user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';

const authRouter: Router = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/refresh', refresh);
authRouter.get('/me', authMiddleware, getProfile);

export default authRouter;