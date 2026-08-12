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

const router = express.Router();
const repo = new PgAnalyticsRepository();

const getTrainingTemplatesController = new GetTrainingTemplatesController(new GetTrainingTemplatesUseCase(repo));
const getSessionsController = new GetSessionsController(new GetSessionsUseCase(repo));
const getSessionSummaryController = new GetSessionSummaryController(new GetSessionSummaryUseCase(repo));
const getSessionAlertsController = new GetSessionAlertsController(new GetSessionAlertsUseCase(repo));
const getTopProblemsController = new GetTopProblemsController(new GetTopProblemsUseCase(repo));
const compareByDepartmentController = new CompareByDepartmentController(new CompareByDepartmentUseCase(repo));
const compareByLocationController = new CompareByLocationController(new CompareByLocationUseCase(repo));
const getTrendsController = new GetTrendsController(new GetTrendsUseCase(repo));

router.get("/analytics/training-templates", (req, res) => getTrainingTemplatesController.execute(req, res));
router.get("/analytics/sessions", (req, res) => getSessionsController.execute(req, res));
router.get("/analytics/sessions/:id/summary", (req, res) => getSessionSummaryController.execute(req, res));
router.get("/analytics/sessions/:id/alerts", (req, res) => getSessionAlertsController.execute(req, res));
router.get("/analytics/sessions/:id/top-problems", (req, res) => getTopProblemsController.execute(req, res));
router.get("/analytics/sessions/:id/compare/departments", (req, res) => compareByDepartmentController.execute(req, res));
router.get("/analytics/sessions/:id/compare/locations", (req, res) => compareByLocationController.execute(req, res));
router.get("/analytics/training-templates/:id/trends", (req, res) => getTrendsController.execute(req, res));

export default router;
