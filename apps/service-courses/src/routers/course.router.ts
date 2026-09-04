import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
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

courseRouter.use(authMiddleware);

// Course routes
courseRouter.get('/', requirePermission('course:read'), listCourses);
courseRouter.post('/', requirePermission('course:write'), createCourse);
courseRouter.get('/:course_id', requirePermission('course:read'), getCourse);
courseRouter.patch('/:course_id', requirePermission('course:write'), updateCourse);
courseRouter.delete('/:course_id', requirePermission('course:write'), deleteCourse);
courseRouter.patch('/:course_id/publish', requirePermission('course:write'), publishCourse);
courseRouter.patch('/:course_id/unpublish', requirePermission('course:write'), unpublishCourse);

// Module routes
courseRouter.get('/:course_id/modules', requirePermission('course:read'), listModules);
courseRouter.post('/:course_id/modules', requirePermission('course:write'), createModule);
courseRouter.get('/:course_id/modules/:module_id', requirePermission('course:read'), getModule);
courseRouter.patch('/:course_id/modules/:module_id', requirePermission('course:write'), updateModule);
courseRouter.delete('/:course_id/modules/:module_id', requirePermission('course:write'), deleteModule);

// Lesson routes
courseRouter.get('/:course_id/modules/:module_id/lessons', requirePermission('course:read'), listLessons);
courseRouter.post('/:course_id/modules/:module_id/lessons', requirePermission('course:write'), createLesson);
courseRouter.get('/:course_id/modules/:module_id/lessons/:lesson_id', requirePermission('course:read'), getLesson);
courseRouter.patch('/:course_id/modules/:module_id/lessons/:lesson_id', requirePermission('course:write'), updateLesson);
courseRouter.delete('/:course_id/modules/:module_id/lessons/:lesson_id', requirePermission('course:write'), deleteLesson);

export default courseRouter;