import express from "express";
import crypto from "crypto";
import { prisma } from "../../../../shared/infra/prisma/prismaClient";
import { generateEventCode } from "../../../../shared/core/shortCode";
import { GetLiveStateUseCase } from "../../application/useCases/getLiveState/GetLiveStateUseCase";
import { GetFullQuizUseCase } from "../../application/useCases/getFullQuiz/GetFullQuizUseCase";

const getLiveStateUseCase = new GetLiveStateUseCase();
const getFullQuizUseCase  = new GetFullQuizUseCase();

const router = express.Router();

// POST /api/v1/live-events
router.post("/live-events", async (req, res) => {
    const { quizId, name } = req.body ?? {};
    const trimmedName   = String(name   ?? "").trim();
    const trimmedQuizId = String(quizId ?? "").trim();

    if (!trimmedName) return res.status(400).json({ message: "name is required" });

    // Generate unique readable code
    let eventCode = generateEventCode(6);
    for (let i = 0; i < 5; i++) {
        const exists = await prisma.quizSession.findUnique({ where: { eventCode } });
        if (!exists) break;
        eventCode = generateEventCode(6);
    }

    const adminToken = crypto.randomBytes(24).toString("hex");

    const created = await prisma.quizSession.create({
        data: {
            eventCode,
            name: trimmedName,
            quizId: trimmedQuizId || undefined,
            status: "ACTIVE",
            adminToken,
        },
    });

    return res.status(201).json({
        eventCode: created.eventCode,
        name: created.name,
        quizId: created.quizId ?? null,
        adminToken,
        joinPath: `/live/${created.eventCode}`,
    });
});

// GET /api/v1/live-events/:eventCode
router.get("/live-events/:eventCode", async (req, res) => {
    const eventCode = String(req.params.eventCode ?? "").trim().toUpperCase();

    const session = await prisma.quizSession.findUnique({
        where: { eventCode },
        include: { _count: { select: { attempts: true } } },
    });

    if (!session) return res.status(404).json({ message: "Live event not found" });

    return res.json({
        eventCode: session.eventCode,
        name: session.name,
        quizId: session.quizId ?? null,
        status: session.status === "ACTIVE" ? "live" : "ended",
        activeQuestionIndex: session.activeQuestionIndex,
        questionVisible: session.questionVisible,
        participantsCount: session._count.attempts,
    });
});

// GET /api/v1/live-events/:eventCode/live
router.get("/live-events/:eventCode/live", async (req, res) => {
    const eventCode = String(req.params.eventCode ?? "").trim().toUpperCase();
    try {
        const dto = await getLiveStateUseCase.execute(eventCode);
        return res.json(dto);
    } catch (err: any) {
        if (err?.code === "NOT_FOUND") {
            return res.status(404).json({ message: "Live event not found" });
        }
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

// GET /api/v1/live-events/:eventCode/full-quiz
router.get("/live-events/:eventCode/full-quiz", async (req, res) => {
    const eventCode = String(req.params.eventCode ?? "").trim().toUpperCase();
    try {
        const dto = await getFullQuizUseCase.execute(eventCode);
        return res.json(dto);
    } catch (err: any) {
        if (err?.code === "NOT_FOUND") return res.status(404).json({ message: "Live event not found" });
        if (err?.code === "NOT_READY") return res.status(503).json({ message: err.message });
        if (err?.code === "WRONG_MODE") return res.status(400).json({ message: err.message });
        console.error(err);
        return res.status(500).json({ message: "Internal server error" });
    }
});

export default router;
