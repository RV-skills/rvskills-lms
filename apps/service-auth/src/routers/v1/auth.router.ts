import { Router } from 'express';
import { register, login, logout, refresh } from '../../controllers/user.controller';

const authRouter: Router = Router();

authRouter.post('/register', register);
authRouter.post('/login', login);
authRouter.post('/logout', logout);
authRouter.post('/refresh', refresh);

export default authRouter;