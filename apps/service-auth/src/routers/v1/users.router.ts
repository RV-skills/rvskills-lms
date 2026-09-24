import { Router } from 'express';
import { getUsersByIds, listUsers, listRoles, assignRole, removeRole } from '../../controllers/user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const usersRouter: Router = Router();

usersRouter.get('/', authMiddleware, getUsersByIds);
usersRouter.get('/all', authMiddleware, requirePermission("user:write"), listUsers);
usersRouter.get('/roles', authMiddleware, requirePermission("user:write"), listRoles);
usersRouter.post('/:user_id/roles', authMiddleware, requirePermission("user:write"), assignRole);
usersRouter.delete('/:user_id/roles/:role_id', authMiddleware, requirePermission("user:write"), removeRole);

export default usersRouter;