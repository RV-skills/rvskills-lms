import { Router } from 'express';
import { authMiddleware } from '../middlewares/auth.middleware';
import { publicRouteMiddleware } from '../middlewares/public-route.middleware';
import { requirePermission } from '../middlewares/rbac.middleware';
import { requireAdmin, requireCourseEditor } from '../middlewares/course-access.middleware';
import {
  createCourse,
  getCourse,
  listCourses,
  updateCourse,
  deleteCourse,
  publishCourse,
  unpublishCourse,
  listFaculty,
  assignFaculty,
  removeFaculty,
  listMyCourses,
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
  setVideoUrl,
  removeVideo,
  addResource,
  removeResource,
} from '../controllers/lesson.controller';

const courseRouter: Router = Router();

// Writes pass through three layers:
//   authMiddleware        who are you?
//   requirePermission     does your role allow course writes at all?
//   requireCourseEditor   are you an admin, or assigned to THIS course?
// requireAdmin replaces the last layer for actions only admins may take.

// Course routes
courseRouter.get('/', publicRouteMiddleware, listCourses);
courseRouter.post('/', authMiddleware, requirePermission('course:write'), createCourse);
// '/mine' must stay above '/:course_id', or "mine" is read as a course id.
courseRouter.get('/mine', authMiddleware, requirePermission('course:write'), listMyCourses);
courseRouter.get('/:course_id', publicRouteMiddleware, getCourse);
courseRouter.patch('/:course_id', authMiddleware, requirePermission('course:write'), requireCourseEditor, updateCourse);
courseRouter.delete('/:course_id', authMiddleware, requirePermission('course:write'), requireAdmin, deleteCourse);
courseRouter.patch('/:course_id/publish', authMiddleware, requirePermission('course:write'), requireAdmin, publishCourse);
courseRouter.patch('/:course_id/unpublish', authMiddleware, requirePermission('course:write'), requireAdmin, unpublishCourse);

// Module routes
courseRouter.get('/:course_id/modules', publicRouteMiddleware, listModules);
courseRouter.post('/:course_id/modules', authMiddleware, requirePermission('course:write'), requireCourseEditor, createModule);
courseRouter.get('/:course_id/modules/:module_id', publicRouteMiddleware, getModule);
courseRouter.patch('/:course_id/modules/:module_id', authMiddleware, requirePermission('course:write'), requireCourseEditor, updateModule);
courseRouter.delete('/:course_id/modules/:module_id', authMiddleware, requirePermission('course:write'), requireCourseEditor, deleteModule);

// Lesson routes
courseRouter.get('/:course_id/modules/:module_id/lessons', publicRouteMiddleware, listLessons);
courseRouter.post('/:course_id/modules/:module_id/lessons', authMiddleware, requirePermission('course:write'), requireCourseEditor, createLesson);
courseRouter.get('/:course_id/modules/:module_id/lessons/:lesson_id', publicRouteMiddleware, getLesson);
courseRouter.patch('/:course_id/modules/:module_id/lessons/:lesson_id', authMiddleware, requirePermission('course:write'), requireCourseEditor, updateLesson);
courseRouter.delete('/:course_id/modules/:module_id/lessons/:lesson_id', authMiddleware, requirePermission('course:write'), requireCourseEditor, deleteLesson);
courseRouter.put('/:course_id/modules/:module_id/lessons/:lesson_id/video', authMiddleware, requirePermission('course:write'), requireCourseEditor, setVideoUrl);
courseRouter.delete('/:course_id/modules/:module_id/lessons/:lesson_id/video', authMiddleware, requirePermission('course:write'), requireCourseEditor, removeVideo);
courseRouter.post('/:course_id/modules/:module_id/lessons/:lesson_id/resources', authMiddleware, requirePermission('course:write'), requireCourseEditor, addResource);
courseRouter.delete('/:course_id/modules/:module_id/lessons/:lesson_id/resources/:resource_id', authMiddleware, requirePermission('course:write'), requireCourseEditor, removeResource);

// Faculty routes: anyone who may edit the course can see who teaches it, but
// only administrators can change it.
courseRouter.get('/:course_id/faculty', authMiddleware, requirePermission('course:write'), requireCourseEditor, listFaculty);
courseRouter.post('/:course_id/faculty', authMiddleware, requirePermission('course:write'), requireAdmin, assignFaculty);
courseRouter.delete('/:course_id/faculty/:faculty_id', authMiddleware, requirePermission('course:write'), requireAdmin, removeFaculty);

export default courseRouter;