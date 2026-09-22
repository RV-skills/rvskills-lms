import { Router } from "express";
import { authMiddleware } from "../middlewares/auth.middleware";
import { requirePermission } from "../middlewares/rbac.middleware";
import {
    createAssessmentController,
    addQuestionController,
    updateQuestionController,
    listAssessmentsForCourseController,
    getAssessmentController,
    getAssessmentFullController,
} from "../controllers/assessment.controller";
import {
    startAttemptController,
    submitAnswerController,
    submitAttemptController,
} from "../controllers/attempt.controller";
import {
    listPendingReviewController,
    gradeAnswerController,
} from "../controllers/grading.controller";

const assessmentRouter: Router = Router();

assessmentRouter.post("/", authMiddleware, requirePermission("exam:write"), createAssessmentController);
assessmentRouter.post("/:assessment_id/questions", authMiddleware, requirePermission("exam:write"), addQuestionController);
assessmentRouter.patch("/questions/:question_id", authMiddleware, requirePermission("exam:write"), updateQuestionController);
assessmentRouter.get("/:assessment_id/full", authMiddleware, requirePermission("exam:write"), getAssessmentFullController);

assessmentRouter.get("/attempts/pending-review", authMiddleware, requirePermission("assignment:grade"), listPendingReviewController);
assessmentRouter.patch("/attempts/answers/:answer_id/grade", authMiddleware, requirePermission("assignment:grade"), gradeAnswerController);

assessmentRouter.get("/course/:course_id", authMiddleware, requirePermission("exam:read"), listAssessmentsForCourseController);
assessmentRouter.get("/:assessment_id", authMiddleware, requirePermission("exam:read"), getAssessmentController);

// Taking an assessment (any authenticated, enrolled student)
assessmentRouter.post("/:assessment_id/attempts", authMiddleware, startAttemptController);
assessmentRouter.post("/attempts/:attempt_id/answers", authMiddleware, submitAnswerController);
assessmentRouter.post("/attempts/:attempt_id/submit", authMiddleware, submitAttemptController);

export default assessmentRouter;