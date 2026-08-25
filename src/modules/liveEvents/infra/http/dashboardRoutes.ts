import express from "express";

import { PgLiveEventAnalyticsRepository } from "../db/PgLiveEventAnalyticsRepository";

import { GetLiveEventSummaryUseCase } from "../../application/useCases/getSummary/GetLiveEventSummaryUseCase";
import { GetLiveEventParticipantsUseCase } from "../../application/useCases/getParticipants/GetLiveEventParticipantsUseCase";
import { GetLiveEventQuestionAnalysisUseCase } from "../../application/useCases/getQuestionAnalysis/GetLiveEventQuestionAnalysisUseCase";

import { GetDashboardSummaryController } from "./controllers/GetDashboardSummaryController";
import { GetDashboardParticipantsController } from "./controllers/GetDashboardParticipantsController";
import { GetDashboardQuestionsController } from "./controllers/GetDashboardQuestionsController";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgLiveEventAnalyticsRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md §11 pipeline. This is the organiser-facing reporting view
// (participant scores, per-question difficulty) — distinct from the
// participant-facing GET /live-events/:eventCode in liveEventRoutes.ts,
// which stays open. Gated with analytics.content.view, same rationale as
// analyticsRoutes.ts's per-item content endpoints.
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

const getSummaryUseCase = new GetLiveEventSummaryUseCase(repo);
const getParticipantsUseCase = new GetLiveEventParticipantsUseCase(repo);
const getQuestionAnalysisUseCase = new GetLiveEventQuestionAnalysisUseCase(repo);

const getSummaryController = new GetDashboardSummaryController(getSummaryUseCase);
const getParticipantsController = new GetDashboardParticipantsController(getParticipantsUseCase);
const getQuestionsController = new GetDashboardQuestionsController(getQuestionAnalysisUseCase);

router.get(
    "/dashboard/:eventCode/summary",
    requireAuthenticatedUser,
    requirePermission("analytics.content.view"),
    applyEffectiveScope,
    (req, res) => getSummaryController.execute(req, res)
);
router.get(
    "/dashboard/:eventCode/participants",
    requireAuthenticatedUser,
    requirePermission("analytics.content.view"),
    applyEffectiveScope,
    (req, res) => getParticipantsController.execute(req, res)
);
router.get(
    "/dashboard/:eventCode/questions",
    requireAuthenticatedUser,
    requirePermission("analytics.content.view"),
    applyEffectiveScope,
    (req, res) => getQuestionsController.execute(req, res)
);

export default router;
