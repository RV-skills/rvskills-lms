import type { NextFunction, Response } from "express";
import {
    ForbiddenError,
    NotFoundError,
    UnauthorizedError,
} from "@rv-lms/shared-utils";
import type { AuthenticatedRequest } from "./auth.middleware";
import { courseRepository } from "../repositories/course.repository";
import { moduleRepository } from "../repositories/module.repository";
import { lessonRepository } from "../repositories/lesson.repository";
import { courseFacultyRepository } from "../repositories/course-faculty.repository";

const ADMIN_ROLE = "Admin";

// The tenant used for a visitor who is not logged in, matching the controllers.
const DEFAULT_TENANT_ID = "rv-skills-tenant";

const isAdmin = (req: AuthenticatedRequest) =>
    req.user?.roles?.includes(ADMIN_ROLE) ?? false;

async function assertPathBelongsToCourse(
    course_id: string,
    module_id?: string,
    lesson_id?: string
) {
    if (module_id) {
        const foundModule = await moduleRepository.findById(module_id);
        if (!foundModule || foundModule.course_id !== course_id) {
            throw new NotFoundError("Module not found in this course");
        }
    }

    if (lesson_id) {
        const foundLesson = await lessonRepository.findById(lesson_id);
        if (!foundLesson || foundLesson.module_id !== module_id) {
            throw new NotFoundError("Lesson not found in this module");
        }
    }
}

export const requireAdmin = (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
) => {
    if (!isAdmin(req)) {
        throw new ForbiddenError("Only an administrator can do this");
    }
    next();
};

export const requireCourseEditor = async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
) => {
    const user = req.user;
    if (!user) {
        throw new UnauthorizedError("Not authenticated");
    }

    const course_id = req.params.course_id as string;
    const module_id = req.params.module_id as string | undefined;
    const lesson_id = req.params.lesson_id as string | undefined;

    const course = await courseRepository.findById(course_id, user.tenant_id);
    if (!course) {
        throw new NotFoundError("Course not found");
    }

    if (!isAdmin(req)) {
        const assigned = await courseFacultyRepository.isFaculty(
            course_id,
            user.user_id
        );
        if (!assigned) {
            throw new ForbiddenError("You are not assigned to this course");
        }
    }

    await assertPathBelongsToCourse(course_id, module_id, lesson_id);

    next();
};

export const requireCourseReadable = async (
    req: AuthenticatedRequest,
    _res: Response,
    next: NextFunction
) => {
    const user = req.user;

    const course_id = req.params.course_id as string;
    const module_id = req.params.module_id as string | undefined;
    const lesson_id = req.params.lesson_id as string | undefined;

    const course = await courseRepository.findById(
        course_id,
        user?.tenant_id ?? DEFAULT_TENANT_ID
    );
    if (!course) {
        throw new NotFoundError("Course not found");
    }

    if (!course.is_published) {
        const allowed =
            user &&
            (isAdmin(req) ||
                (await courseFacultyRepository.isFaculty(course_id, user.user_id)));
        if (!allowed) {
            throw new NotFoundError("Course not found");
        }
    }

    await assertPathBelongsToCourse(course_id, module_id, lesson_id);

    next();
};