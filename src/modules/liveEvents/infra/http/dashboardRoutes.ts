import express from "express";

import { PgLiveEventAnalyticsRepository } from "../db/PgLiveEventAnalyticsRepository";

import { GetLiveEventSummaryUseCase } from "../../application/useCases/getSummary/GetLiveEventSummaryUseCase";
import { GetLiveEventParticipantsUseCase } from "../../application/useCases/getParticipants/GetLiveEventParticipantsUseCase";
import { GetLiveEventQuestionAnalysisUseCase } from "../../application/useCases/getQuestionAnalysis/GetLiveEventQuestionAnalysisUseCase";

import { GetDashboardSummaryController } from "./controllers/GetDashboardSummaryController";
import { GetDashboardParticipantsController } from "./controllers/GetDashboardParticipantsController";
import { GetDashboardQuestionsController } from "./controllers/GetDashboardQuestionsController";

const router = express.Router();
const repo = new PgLiveEventAnalyticsRepository();

const getSummaryUseCase = new GetLiveEventSummaryUseCase(repo);
const getParticipantsUseCase = new GetLiveEventParticipantsUseCase(repo);
const getQuestionAnalysisUseCase = new GetLiveEventQuestionAnalysisUseCase(repo);

const getSummaryController = new GetDashboardSummaryController(getSummaryUseCase);
const getParticipantsController = new GetDashboardParticipantsController(getParticipantsUseCase);
const getQuestionsController = new GetDashboardQuestionsController(getQuestionAnalysisUseCase);

router.get("/dashboard/:eventCode/summary", (req, res) => getSummaryController.execute(req, res));
router.get("/dashboard/:eventCode/participants", (req, res) => getParticipantsController.execute(req, res));
router.get("/dashboard/:eventCode/questions", (req, res) => getQuestionsController.execute(req, res));

export default router;
