import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { listCourses, getCourseDetail } from "../services/courses.service";
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