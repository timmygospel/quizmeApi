import { Router } from "express";

import { GetSessionSummaryUseCase } from "../../application/useCases/getSessionSummary/GetSessionSummaryUseCase";
import { GetParticipantTableUseCase } from "../../application/useCases/getParticipantTable/GetParticipantTableUseCase";
import { GetQuestionAnalysisUseCase } from "../../application/useCases/getQuestionAnalysis/GetQuestionAnalysisUseCase";
import { GetScoreDistributionUseCase } from "../../application/useCases/getScoreDistribution/GetScoreDistributionUseCase";
import { GetTopicBreakdownUseCase } from "../../application/useCases/getTopicBreakdown/GetTopicBreakdownUseCase";
import { ExportParticipantsCsvUseCase } from "../../application/useCases/exportCsv/ExportParticipantsCsvUseCase";

import { GetSessionSummaryController } from "./controllers/GetSessionSummaryController";
import { GetParticipantTableController } from "./controllers/GetParticipantTableController";
import { GetQuestionAnalysisController } from "./controllers/GetQuestionAnalysisController";
import { GetScoreDistributionController } from "./controllers/GetScoreDistributionController";
import { GetTopicBreakdownController } from "./controllers/GetTopicBreakdownController";

import { authMiddleware } from "../../../../shared/infra/http/middleware/authMiddleware";
import { requireRole } from "../../../../shared/infra/http/middleware/requireRole";
import { cachedDashboard } from "../../../../shared/infra/cache/DashboardCache";
import { AuditLogService } from "../../../../shared/infra/audit/AuditLogService";
import { prisma } from "../../../../shared/infra/prisma/prismaClient";

const router = Router();

// Dependency chain (no DI container — follows project convention)
const summaryUseCase         = new GetSessionSummaryUseCase();
const participantTableUseCase = new GetParticipantTableUseCase();
const questionAnalysisUseCase = new GetQuestionAnalysisUseCase();
const scoreDistributionUseCase = new GetScoreDistributionUseCase();
const topicBreakdownUseCase  = new GetTopicBreakdownUseCase();
const exportCsvUseCase       = new ExportParticipantsCsvUseCase();

const summaryController          = new GetSessionSummaryController(summaryUseCase);
const participantTableController = new GetParticipantTableController(participantTableUseCase);
const questionAnalysisController = new GetQuestionAnalysisController(questionAnalysisUseCase);
const scoreDistributionController = new GetScoreDistributionController(scoreDistributionUseCase);
const topicBreakdownController   = new GetTopicBreakdownController(topicBreakdownUseCase);

// All dashboard routes require authentication + ADMIN or TRAINER role
router.use(authMiddleware, requireRole("ADMIN", "TRAINER"));

// Helper: look up session status for cache TTL decisions
async function sessionStatus(eventCode: string): Promise<string | undefined> {
    const s = await prisma.quizSession.findUnique({
        where: { eventCode },
        select: { status: true },
    }).catch(() => null);
    return s?.status;
}

/**
 * Dashboard routes — all scoped by session eventCode
 *
 * GET /api/v1/dashboard/:eventCode/summary
 * GET /api/v1/dashboard/:eventCode/participants  ?page&pageSize&sortBy&sortDir&search
 * GET /api/v1/dashboard/:eventCode/questions
 * GET /api/v1/dashboard/:eventCode/score-distribution
 * GET /api/v1/dashboard/:eventCode/topics
 * GET /api/v1/dashboard/:eventCode/export/csv
 */

router.get("/:eventCode/summary", async (req, res, next) => {
    const { eventCode } = req.params;
    AuditLogService.log("dashboard.view.summary", {
        userId: req.user?.userId,
        meta: { eventCode },
    });
    try {
        const status = await sessionStatus(eventCode);
        const dto = await cachedDashboard(eventCode, "summary", status, () =>
            summaryUseCase.execute(eventCode),
        );
        res.json(dto);
    } catch (err) {
        next(err);
    }
});

router.get("/:eventCode/participants", async (req, res, next) => {
    const { eventCode } = req.params;
    AuditLogService.log("dashboard.view.participants", {
        userId: req.user?.userId,
        meta: { eventCode },
    });
    // Participant table is not cached — it supports dynamic sort/search/pagination
    summaryController; // unused — handled inline below via use case directly
    participantTableController.execute(req, res);
});

router.get("/:eventCode/questions", async (req, res, next) => {
    const { eventCode } = req.params;
    AuditLogService.log("dashboard.view.questions", {
        userId: req.user?.userId,
        meta: { eventCode },
    });
    try {
        const status = await sessionStatus(eventCode);
        const dto = await cachedDashboard(eventCode, "questions", status, () =>
            questionAnalysisUseCase.execute(eventCode),
        );
        res.json(dto);
    } catch (err) {
        next(err);
    }
});

router.get("/:eventCode/score-distribution", async (req, res, next) => {
    const { eventCode } = req.params;
    AuditLogService.log("dashboard.view.score-distribution", {
        userId: req.user?.userId,
        meta: { eventCode },
    });
    try {
        const status = await sessionStatus(eventCode);
        const dto = await cachedDashboard(eventCode, "score-distribution", status, () =>
            scoreDistributionUseCase.execute(eventCode),
        );
        res.json(dto);
    } catch (err) {
        next(err);
    }
});

router.get("/:eventCode/topics", async (req, res, next) => {
    const { eventCode } = req.params;
    AuditLogService.log("dashboard.view.topics", {
        userId: req.user?.userId,
        meta: { eventCode },
    });
    try {
        const status = await sessionStatus(eventCode);
        const dto = await cachedDashboard(eventCode, "topics", status, () =>
            topicBreakdownUseCase.execute(eventCode),
        );
        res.json(dto);
    } catch (err) {
        next(err);
    }
});

router.get("/:eventCode/export/csv", async (req, res) => {
    const { eventCode } = req.params;
    AuditLogService.log("dashboard.export.csv", {
        userId: req.user?.userId,
        meta: { eventCode },
    });
    try {
        const { csv, filename } = await exportCsvUseCase.execute(eventCode);
        res.setHeader("Content-Type", "text/csv; charset=utf-8");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.send(csv);
    } catch (err: any) {
        if (err?.code === "P2025") {
            res.status(404).json({ message: `Session '${eventCode}' not found` });
        } else {
            res.status(500).json({ message: "Internal server error" });
        }
    }
});

export default router;
