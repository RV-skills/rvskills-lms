import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { listCourses, getCourseDetail, createCourse, listMyCourses } from "../services/courses.service";
import { NotFoundError } from "@rv-lms/shared-utils";
import {
  listCourseRatings as fetchCourseRatings,
  getAverageRating as fetchAverageRating,
  submitRating as submitCourseRating,
  updateRating as updateCourseRating,
} from "../services/enrollment.service";
import { markLessonComplete as markLessonCompleteService } from "../services/enrollment.service";
import { listCoursesForAdmin, publishCourse as publishCourseService, unpublishCourse as unpublishCourseService } from "../services/courses.service";
import { listCourseFaculty, assignCourseFaculty, removeCourseFaculty } from "../services/courses.service";
import {
  createModule as createModuleService,
  updateModule as updateModuleService,
  deleteModule as deleteModuleService,
  createLesson as createLessonService,
  updateLesson as updateLessonService,
  deleteLesson as deleteLessonService,
} from "../services/courses.service";
import { updateCourseDetails } from "../services/courses.service";


export async function listCoursesController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const courses = await listCourses(req.accessToken);
    res.status(200).json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
}

export async function getCourseDetailController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const course = await getCourseDetail(course_id, req.accessToken);
    if (!course) {
      throw new NotFoundError("Course not found");
    }
    res.status(200).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
}

export async function listCourseRatingsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const ratings = await fetchCourseRatings(course_id);
    res.status(200).json({ success: true, data: ratings });
  } catch (err) {
    next(err);
  }
}

export async function getAverageRatingController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const result = await fetchAverageRating(course_id);
    res.status(200).json({ success: true, data: result });
  } catch (err) {
    next(err);
  }
}

export async function submitRatingController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const rating = await submitCourseRating(course_id, req.body, req.accessToken!);
    res.status(201).json({ success: true, data: rating });
  } catch (err) {
    next(err);
  }
}

export async function updateRatingController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const rating = await updateCourseRating(course_id, req.body, req.accessToken!);
    res.status(200).json({ success: true, data: rating });
  } catch (err) {
    next(err);
  }
}

export async function markLessonCompleteController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const lesson_id = req.params.lesson_id as string;
    await markLessonCompleteService(course_id, lesson_id, req.accessToken!);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listCoursesForAdminController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const courses = await listCoursesForAdmin(req.accessToken!);
    res.status(200).json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
}

export async function publishCourseController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    await publishCourseService(course_id, req.accessToken!);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function unpublishCourseController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    await unpublishCourseService(course_id, req.accessToken!);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listCourseFacultyController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const faculty = await listCourseFaculty(course_id, req.accessToken!);
    res.status(200).json({ success: true, data: faculty });
  } catch (err) {
    next(err);
  }
}

export async function assignCourseFacultyController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const { faculty_id } = req.body as { faculty_id: string };
    await assignCourseFaculty(course_id, faculty_id, req.accessToken!);
    res.status(201).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function removeCourseFacultyController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const faculty_id = req.params.faculty_id as string;
    await removeCourseFaculty(course_id, faculty_id, req.accessToken!);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function listMyCoursesController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const courses = await listMyCourses(req.accessToken!);
    res.status(200).json({ success: true, data: courses });
  } catch (err) {
    next(err);
  }
}

export async function createCourseController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course = await createCourse(req.body, req.accessToken!);
    res.status(201).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
}

export async function createModuleController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const module = await createModuleService(course_id, req.body, req.accessToken!);
    res.status(201).json({ success: true, data: module });
  } catch (err) {
    next(err);
  }
}

export async function updateModuleController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const module_id = req.params.module_id as string;
    const module = await updateModuleService(course_id, module_id, req.body, req.accessToken!);
    res.status(200).json({ success: true, data: module });
  } catch (err) {
    next(err);
  }
}

export async function deleteModuleController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const module_id = req.params.module_id as string;
    await deleteModuleService(course_id, module_id, req.accessToken!);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function createLessonController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const module_id = req.params.module_id as string;
    const lesson = await createLessonService(course_id, module_id, req.body, req.accessToken!);
    res.status(201).json({ success: true, data: lesson });
  } catch (err) {
    next(err);
  }
}

export async function updateLessonController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const module_id = req.params.module_id as string;
    const lesson_id = req.params.lesson_id as string;
    const lesson = await updateLessonService(course_id, module_id, lesson_id, req.body, req.accessToken!);
    res.status(200).json({ success: true, data: lesson });
  } catch (err) {
    next(err);
  }
}

export async function deleteLessonController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const module_id = req.params.module_id as string;
    const lesson_id = req.params.lesson_id as string;
    await deleteLessonService(course_id, module_id, lesson_id, req.accessToken!);
    res.status(200).json({ success: true });
  } catch (err) {
    next(err);
  }
}

export async function updateCourseController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const course = await updateCourseDetails(course_id, req.body, req.accessToken!);
    res.status(200).json({ success: true, data: course });
  } catch (err) {
    next(err);
  }
}

import { setLessonVideo, removeLessonVideo, addLessonResource, removeLessonResource } from "../services/courses.service";

export async function setLessonVideoController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { course_id, module_id, lesson_id } = req.params as { course_id: string; module_id: string; lesson_id: string };
    const { video_url } = req.body as { video_url: string };
    const lesson = await setLessonVideo(course_id, module_id, lesson_id, video_url, req.accessToken!);
    res.status(200).json({ success: true, data: lesson });
  } catch (err) {
    next(err);
  }
}

export async function removeLessonVideoController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { course_id, module_id, lesson_id } = req.params as { course_id: string; module_id: string; lesson_id: string };
    const lesson = await removeLessonVideo(course_id, module_id, lesson_id, req.accessToken!);
    res.status(200).json({ success: true, data: lesson });
  } catch (err) {
    next(err);
  }
}

export async function addLessonResourceController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { course_id, module_id, lesson_id } = req.params as { course_id: string; module_id: string; lesson_id: string };
    const { title, pdf_url } = req.body as { title: string; pdf_url: string };
    const lesson = await addLessonResource(course_id, module_id, lesson_id, title, pdf_url, req.accessToken!);
    res.status(201).json({ success: true, data: lesson });
  } catch (err) {
    next(err);
  }
}

export async function removeLessonResourceController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const { course_id, module_id, lesson_id, resource_id } = req.params as { course_id: string; module_id: string; lesson_id: string; resource_id: string };
    const lesson = await removeLessonResource(course_id, module_id, lesson_id, resource_id, req.accessToken!);
    res.status(200).json({ success: true, data: lesson });
  } catch (err) {
    next(err);
  }
}