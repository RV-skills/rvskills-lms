import { Router } from "express";
import { authMiddleware } from "../../middlewares/auth.middleware";
import {
  createAssessmentController,
  addQuestionController,
  updateQuestionController,
  listAssessmentsForCourseController,
  getAssessmentController,
  getAssessmentFullController,
} from "../../controllers/assessment.controller";
import {
    getMyAttemptsController,
  startAttemptController,
  submitAnswerController,
  submitAttemptController,
} from "../../controllers/attempt.controller";
import {
  listPendingReviewController,
  gradeAnswerController,
} from "../../controllers/grading.controller";

const assessmentsRouter: Router = Router();

assessmentsRouter.post("/", authMiddleware, createAssessmentController);
assessmentsRouter.post("/:assessment_id/questions", authMiddleware, addQuestionController);
assessmentsRouter.patch("/questions/:question_id", authMiddleware, updateQuestionController);
assessmentsRouter.get("/:assessment_id/full", authMiddleware, getAssessmentFullController);

assessmentsRouter.get("/attempts/pending-review", authMiddleware, listPendingReviewController);
assessmentsRouter.patch("/attempts/answers/:answer_id/grade", authMiddleware, gradeAnswerController);

assessmentsRouter.get("/course/:course_id", authMiddleware, listAssessmentsForCourseController);
assessmentsRouter.get("/:assessment_id", authMiddleware, getAssessmentController);

assessmentsRouter.post("/:assessment_id/attempts", authMiddleware, startAttemptController);
assessmentsRouter.post("/attempts/:attempt_id/answers", authMiddleware, submitAnswerController);
assessmentsRouter.post("/attempts/:attempt_id/submit", authMiddleware, submitAttemptController);

assessmentsRouter.get("/:assessment_id/attempts/mine", authMiddleware, getMyAttemptsController);

export default assessmentsRouter;