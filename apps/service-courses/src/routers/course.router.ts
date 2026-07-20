import { Router } from 'express';
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
courseRouter.get('/', listCourses);
courseRouter.post('/', createCourse);
courseRouter.get('/:course_id', getCourse);
courseRouter.patch('/:course_id', updateCourse);
courseRouter.delete('/:course_id', deleteCourse);
courseRouter.patch('/:course_id/publish', publishCourse);
courseRouter.patch('/:course_id/unpublish', unpublishCourse);

// Module routes
courseRouter.get('/:course_id/modules', listModules);
courseRouter.post('/:course_id/modules', createModule);
courseRouter.get('/:course_id/modules/:module_id', getModule);
courseRouter.patch('/:course_id/modules/:module_id', updateModule);
courseRouter.delete('/:course_id/modules/:module_id', deleteModule);

// Lesson routes
courseRouter.get('/:course_id/modules/:module_id/lessons', listLessons);
courseRouter.post('/:course_id/modules/:module_id/lessons', createLesson);
courseRouter.get('/:course_id/modules/:module_id/lessons/:lesson_id', getLesson);
courseRouter.patch('/:course_id/modules/:module_id/lessons/:lesson_id', updateLesson);
courseRouter.delete('/:course_id/modules/:module_id/lessons/:lesson_id', deleteLesson);

export default courseRouter;