import { Response, NextFunction } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { assessmentService } from "../services/assessment.service";
import { getUsersByIds } from "../services/users.service";

export async function createAssessmentController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const data = await assessmentService.createAssessment(req.body, req.accessToken!);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function addQuestionController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const assessment_id = req.params.assessment_id as string;
    const data = await assessmentService.addQuestion(assessment_id, req.body, req.accessToken!);
    res.status(201).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateQuestionController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const question_id = req.params.question_id as string;
    const data = await assessmentService.updateQuestion(question_id, req.body, req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function listAssessmentsForCourseController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const course_id = req.params.course_id as string;
    const data = await assessmentService.listAssessmentsForCourse(course_id, req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAssessmentController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const assessment_id = req.params.assessment_id as string;
    const data = await assessmentService.getAssessment(assessment_id, req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAssessmentFullController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const assessment_id = req.params.assessment_id as string;
    const data = await assessmentService.getAssessmentFull(assessment_id, req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function updateAssessmentController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const assessment_id = req.params.assessment_id as string;
    const data = await assessmentService.updateAssessment(assessment_id, req.body, req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function deleteQuestionController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const question_id = req.params.question_id as string;
    const data = await assessmentService.deleteQuestion(question_id, req.accessToken!);
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getResultsController(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  try {
    const assessment_id = req.params.assessment_id as string;
    const results = (await assessmentService.getResults(assessment_id, req.accessToken!)) as {
      students: { student_id: string }[];
    };

    // Faculty need names, not IDs. If the lookup fails, the results still load.
    const ids = results.students.map((s) => s.student_id);
    let nameById = new Map<string, string>();
    if (ids.length > 0) {
      try {
        const users = await getUsersByIds(ids, req.accessToken!);
        nameById = new Map(users.map((u) => [u.user_id, `${u.first_name} ${u.last_name}`]));
      } catch {
        // keep the fallback below
      }
    }
    const data = {
      ...results,
      students: results.students.map((s) => ({ ...s, student_name: nameById.get(s.student_id) ?? "Student" })),
    };
    res.status(200).json({ success: true, data });
  } catch (err) {
    next(err);
  }
}
