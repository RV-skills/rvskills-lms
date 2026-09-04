import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { publicRouteMiddleware } from '../middlewares/public-route.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import {
  createCourse,
  getCourse,
  listCourses,
  updateCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
} from '../controllers/course.controller';

import {
  createModule,
  getModule,
  listModules,
  updateModule,
  deleteModule,
} from '../controllers/module.controller';

import {
  createLesson,
  getLesson,
  listLessons,
  updateLesson,
  deleteLesson,
} from '../controllers/lesson.controller';

const courseRouter: Router = Router();

// Course routes
courseRouter.get('/', publicRouteMiddleware, listCourses);
courseRouter.post('/', authMiddleware, requirePermission('course:write'), createCourse);
courseRouter.get('/:course_id', publicRouteMiddleware, getCourse);
courseRouter.patch('/:course_id', authMiddleware, requirePermission('course:write'), updateCourse);
courseRouter.delete('/:course_id', authMiddleware, requirePermission('course:write'), deleteCourse);
courseRouter.patch('/:course_id/publish', authMiddleware, requirePermission('course:write'), publishCourse);
courseRouter.patch('/:course_id/unpublish', authMiddleware, requirePermission('course:write'), unpublishCourse);

// Module routes
courseRouter.get('/:course_id/modules', publicRouteMiddleware, listModules);
courseRouter.post('/:course_id/modules', authMiddleware, requirePermission('course:write'), createModule);
courseRouter.get('/:course_id/modules/:module_id', publicRouteMiddleware, getModule);
courseRouter.patch('/:course_id/modules/:module_id', authMiddleware, requirePermission('course:write'), updateModule);
courseRouter.delete('/:course_id/modules/:module_id', authMiddleware, requirePermission('course:write'), deleteModule);

// Lesson routes
courseRouter.get('/:course_id/modules/:module_id/lessons', publicRouteMiddleware, listLessons);
courseRouter.post('/:course_id/modules/:module_id/lessons', authMiddleware, requirePermission('course:write'), createLesson);
courseRouter.get('/:course_id/modules/:module_id/lessons/:lesson_id', publicRouteMiddleware, getLesson);
courseRouter.patch('/:course_id/modules/:module_id/lessons/:lesson_id', authMiddleware, requirePermission('course:write'), updateLesson);
courseRouter.delete('/:course_id/modules/:module_id/lessons/:lesson_id', authMiddleware, requirePermission('course:write'), deleteLesson);

export default courseRouter;