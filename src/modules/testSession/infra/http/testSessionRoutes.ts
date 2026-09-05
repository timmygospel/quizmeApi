import express from "express";

import { PgTestSessionRepository } from "../db/PgTestSessionRepository";
import { PgAttemptRepository } from "../db/PgAttemptRepository";
import { PgAssessmentRepository } from "../../../assessment/infra/db/PgAssessmentRepository";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";

import { PreviewAudienceUseCase } from "../../application/useCases/previewAudience/PreviewAudienceUseCase";
import { CreateTestSessionUseCase } from "../../application/useCases/createTestSession/CreateTestSessionUseCase";
import { GetAllTestSessionsUseCase } from "../../application/useCases/getAllTestSessions/GetAllTestSessionsUseCase";
import { GetTestSessionUseCase } from "../../application/useCases/getTestSession/GetTestSessionUseCase";
import { CloseTestSessionUseCase } from "../../application/useCases/closeTestSession/CloseTestSessionUseCase";
import { CancelTestSessionUseCase } from "../../application/useCases/cancelTestSession/CancelTestSessionUseCase";
import { GetResultsUseCase } from "../../application/useCases/getResults/GetResultsUseCase";
import { GetAnalyticsBreakdownUseCase } from "../../application/useCases/getAnalyticsBreakdown/GetAnalyticsBreakdownUseCase";
import { GetMyTestSessionsUseCase } from "../../application/useCases/getMyTestSessions/GetMyTestSessionsUseCase";
import { StartAttemptUseCase } from "../../application/useCases/startAttempt/StartAttemptUseCase";
import { SaveResponseUseCase } from "../../application/useCases/saveResponse/SaveResponseUseCase";
import { SubmitAttemptUseCase } from "../../application/useCases/submitAttempt/SubmitAttemptUseCase";

import { PreviewAudienceController } from "./controllers/PreviewAudienceController";
import { CreateTestSessionController } from "./controllers/CreateTestSessionController";
import { GetAllTestSessionsController } from "./controllers/GetAllTestSessionsController";
import { GetTestSessionController } from "./controllers/GetTestSessionController";
import { CloseTestSessionController } from "./controllers/CloseTestSessionController";
import { CancelTestSessionController } from "./controllers/CancelTestSessionController";
import { GetResultsController } from "./controllers/GetResultsController";
import { GetAnalyticsBreakdownController } from "./controllers/GetAnalyticsBreakdownController";
import { GetMyTestSessionsController } from "./controllers/GetMyTestSessionsController";
import { StartAttemptController } from "./controllers/StartAttemptController";
import { SaveResponseController } from "./controllers/SaveResponseController";
import { SubmitAttemptController } from "./controllers/SubmitAttemptController";

import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();

const testSessionRepo = new PgTestSessionRepository();
const attemptRepo = new PgAttemptRepository();
const assessmentRepo = new PgAssessmentRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md §11 pipeline for trainer/manager-facing routes, reusing the
// existing session.*/participant.read codes — SESSION-BE-002 introduces no
// new permission codes. Participant-facing routes (attempts, /me/...) below
// use only requireAuthenticatedUser: their authorization is a per-resource
// ownership check performed inside the use case ("is this user the assigned
// participant/attempt owner"), never a role/scope check — per the spec's
// explicit "never allow access simply because someone knows the Session id".
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

const previewAudienceController = new PreviewAudienceController(new PreviewAudienceUseCase(testSessionRepo));
const createTestSessionController = new CreateTestSessionController(
    new CreateTestSessionUseCase(testSessionRepo, assessmentRepo)
);
const getAllTestSessionsController = new GetAllTestSessionsController(new GetAllTestSessionsUseCase(testSessionRepo));
const getTestSessionController = new GetTestSessionController(new GetTestSessionUseCase(testSessionRepo));
const closeTestSessionController = new CloseTestSessionController(new CloseTestSessionUseCase(testSessionRepo));
const cancelTestSessionController = new CancelTestSessionController(new CancelTestSessionUseCase(testSessionRepo));
const getResultsController = new GetResultsController(new GetResultsUseCase(testSessionRepo));
const getAnalyticsBreakdownController = new GetAnalyticsBreakdownController(
    new GetAnalyticsBreakdownUseCase(testSessionRepo)
);
const getMyTestSessionsController = new GetMyTestSessionsController(new GetMyTestSessionsUseCase(testSessionRepo));
const startAttemptController = new StartAttemptController(
    new StartAttemptUseCase(testSessionRepo, attemptRepo, assessmentRepo)
);
const saveResponseController = new SaveResponseController(
    new SaveResponseUseCase(attemptRepo, testSessionRepo, assessmentRepo)
);
const submitAttemptController = new SubmitAttemptController(
    new SubmitAttemptUseCase(attemptRepo, testSessionRepo, assessmentRepo)
);

router.post(
    "/test-sessions/audience-preview",
    requireAuthenticatedUser,
    requirePermission("session.create"),
    applyEffectiveScope,
    (req, res) => previewAudienceController.execute(req, res)
);
router.post(
    "/test-sessions",
    requireAuthenticatedUser,
    requirePermission("session.create"),
    applyEffectiveScope,
    (req, res) => createTestSessionController.execute(req, res)
);
router.get(
    "/test-sessions",
    requireAuthenticatedUser,
    requirePermission("session.read"),
    applyEffectiveScope,
    (req, res) => getAllTestSessionsController.execute(req, res)
);
router.get(
    "/test-sessions/:id",
    requireAuthenticatedUser,
    requirePermission("session.read"),
    applyEffectiveScope,
    (req, res) => getTestSessionController.execute(req, res)
);
router.post(
    "/test-sessions/:id/close",
    requireAuthenticatedUser,
    requirePermission("session.manage"),
    applyEffectiveScope,
    (req, res) => closeTestSessionController.execute(req, res)
);
router.post(
    "/test-sessions/:id/cancel",
    requireAuthenticatedUser,
    requirePermission("session.manage"),
    applyEffectiveScope,
    (req, res) => cancelTestSessionController.execute(req, res)
);
router.get(
    "/test-sessions/:id/results",
    requireAuthenticatedUser,
    requirePermission("session.manage"),
    applyEffectiveScope,
    (req, res) => getResultsController.execute(req, res)
);
router.get(
    "/test-sessions/:id/analytics",
    requireAuthenticatedUser,
    requirePermission("session.manage"),
    applyEffectiveScope,
    (req, res) => getAnalyticsBreakdownController.execute(req, res)
);
router.get("/me/test-sessions", requireAuthenticatedUser, (req, res) => getMyTestSessionsController.execute(req, res));
router.post("/test-sessions/:sessionId/attempts", requireAuthenticatedUser, (req, res) =>
    startAttemptController.execute(req, res)
);
router.put("/attempts/:attemptId/questions/:questionId/response", requireAuthenticatedUser, (req, res) =>
    saveResponseController.execute(req, res)
);
router.post("/attempts/:attemptId/submit", requireAuthenticatedUser, (req, res) =>
    submitAttemptController.execute(req, res)
);

export default router;
