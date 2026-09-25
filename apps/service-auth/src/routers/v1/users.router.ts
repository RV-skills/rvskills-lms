import { Router } from 'express';
import { getUsersByIds, listUsers, listRoles, assignRole, removeRole, adminCreateUser, adminBatchCreateStudents, adminSetUserStatus, adminResetPassword } from '../../controllers/user.controller';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { requirePermission } from '../../middlewares/rbac.middleware';

const usersRouter: Router = Router();

usersRouter.get('/', authMiddleware, getUsersByIds);
usersRouter.get('/all', authMiddleware, requirePermission("user:write"), listUsers);
usersRouter.get('/roles', authMiddleware, requirePermission("user:write"), listRoles);
usersRouter.post('/:user_id/roles', authMiddleware, requirePermission("user:write"), assignRole);
usersRouter.delete('/:user_id/roles/:role_id', authMiddleware, requirePermission("user:write"), removeRole);
usersRouter.post('/', authMiddleware, requirePermission("user:write"), adminCreateUser);
usersRouter.post('/batch', authMiddleware, requirePermission("user:write"), adminBatchCreateStudents);
usersRouter.patch('/:user_id/status', authMiddleware, requirePermission("user:write"), adminSetUserStatus);
usersRouter.post('/:user_id/reset-password', authMiddleware, requirePermission("user:write"), adminResetPassword);

export default usersRouter;