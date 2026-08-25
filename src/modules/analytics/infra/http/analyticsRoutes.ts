import express from "express";

import { PgAnalyticsRepository } from "../db/PgAnalyticsRepository";

import { GetTrainingTemplatesUseCase } from "../../application/useCases/GetTrainingTemplatesUseCase";
import { GetSessionsUseCase } from "../../application/useCases/GetSessionsUseCase";
import { GetSessionSummaryUseCase } from "../../application/useCases/GetSessionSummaryUseCase";
import { GetSessionAlertsUseCase } from "../../application/useCases/GetSessionAlertsUseCase";
import { GetTopProblemsUseCase } from "../../application/useCases/GetTopProblemsUseCase";
import { CompareByDepartmentUseCase } from "../../application/useCases/CompareByDepartmentUseCase";
import { CompareByLocationUseCase } from "../../application/useCases/CompareByLocationUseCase";
import { GetTrendsUseCase } from "../../application/useCases/GetTrendsUseCase";

import { GetTrainingTemplatesController } from "./controllers/GetTrainingTemplatesController";
import { GetSessionsController } from "./controllers/GetSessionsController";
import { GetSessionSummaryController } from "./controllers/GetSessionSummaryController";
import { GetSessionAlertsController } from "./controllers/GetSessionAlertsController";
import { GetTopProblemsController } from "./controllers/GetTopProblemsController";
import { CompareByDepartmentController } from "./controllers/CompareByDepartmentController";
import { CompareByLocationController } from "./controllers/CompareByLocationController";
import { GetTrendsController } from "./controllers/GetTrendsController";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgAnalyticsRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md §11 pipeline. Mapping across the §10 analytics.* codes,
// following §2's Core Permission Matrix: browse/list endpoints and
// people/performance data (summary, alerts, department/location comparison)
// use analytics.team.view — matching Manager's matrix grant of "View team
// analytics ✅ within scope" / "Compare departments|locations ✅ (scoped)".
// Content-quality data (top-problems, template trends) uses
// analytics.content.view instead, matching Content Creator's "View content
// analytics ✅ aggregated" while Manager's matrix row for that is ❌.
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

const getTrainingTemplatesController = new GetTrainingTemplatesController(new GetTrainingTemplatesUseCase(repo));
const getSessionsController = new GetSessionsController(new GetSessionsUseCase(repo));
const getSessionSummaryController = new GetSessionSummaryController(new GetSessionSummaryUseCase(repo));
const getSessionAlertsController = new GetSessionAlertsController(new GetSessionAlertsUseCase(repo));
const getTopProblemsController = new GetTopProblemsController(new GetTopProblemsUseCase(repo));
const compareByDepartmentController = new CompareByDepartmentController(new CompareByDepartmentUseCase(repo));
const compareByLocationController = new CompareByLocationController(new CompareByLocationUseCase(repo));
const getTrendsController = new GetTrendsController(new GetTrendsUseCase(repo));

router.get(
    "/analytics/training-templates",
    requireAuthenticatedUser,
    requirePermission("analytics.team.view"),
    applyEffectiveScope,
    (req, res) => getTrainingTemplatesController.execute(req, res)
);
router.get(
    "/analytics/sessions",
    requireAuthenticatedUser,
    requirePermission("analytics.team.view"),
    applyEffectiveScope,
    (req, res) => getSessionsController.execute(req, res)
);
router.get(
    "/analytics/sessions/:id/summary",
    requireAuthenticatedUser,
    requirePermission("analytics.team.view"),
    applyEffectiveScope,
    (req, res) => getSessionSummaryController.execute(req, res)
);
router.get(
    "/analytics/sessions/:id/alerts",
    requireAuthenticatedUser,
    requirePermission("analytics.team.view"),
    applyEffectiveScope,
    (req, res) => getSessionAlertsController.execute(req, res)
);
router.get(
    "/analytics/sessions/:id/top-problems",
    requireAuthenticatedUser,
    requirePermission("analytics.content.view"),
    applyEffectiveScope,
    (req, res) => getTopProblemsController.execute(req, res)
);
router.get(
    "/analytics/sessions/:id/compare/departments",
    requireAuthenticatedUser,
    requirePermission("analytics.team.view"),
    applyEffectiveScope,
    (req, res) => compareByDepartmentController.execute(req, res)
);
router.get(
    "/analytics/sessions/:id/compare/locations",
    requireAuthenticatedUser,
    requirePermission("analytics.team.view"),
    applyEffectiveScope,
    (req, res) => compareByLocationController.execute(req, res)
);
router.get(
    "/analytics/training-templates/:id/trends",
    requireAuthenticatedUser,
    requirePermission("analytics.content.view"),
    applyEffectiveScope,
    (req, res) => getTrendsController.execute(req, res)
);

export default router;
