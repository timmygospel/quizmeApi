import express from "express";
import { LiveEventModel } from "../db/LiveEventModel";
import { generateEventCode } from "../../../../shared/core/shortCode";
import crypto from "crypto";

const router = express.Router();

// POST /api/v1/live-events
router.post("/live-events", async (req, res) => {
    const { quizId, name } = req.body ?? {};
    const trimmedName = String(name ?? "").trim();
    const trimmedQuizId = String(quizId ?? "").trim();

    if (!trimmedQuizId) return res.status(400).json({ message: "quizId is required" });
    if (!trimmedName) return res.status(400).json({ message: "name is required" });

    // generate unique readable code
    let eventCode = generateEventCode(6);
    for (let i = 0; i < 5; i++) {
        const exists = await LiveEventModel.findOne({ eventCode }).exec();
        if (!exists) break;
        eventCode = generateEventCode(6);
    }

    const adminToken = crypto.randomBytes(24).toString("hex");

    const created = await LiveEventModel.create({
        eventCode,
        name: trimmedName,
        quizId: trimmedQuizId,
        status: "live",
        activeQuestionIndex: 0,
        questionVisible: false,
        adminToken,
    });

    return res.status(201).json({
        eventCode: created.eventCode,
        name: created.name,
        quizId: created.quizId,
        adminToken, // store client-side for admin controls
        joinPath: `/live/${created.eventCode}`, // frontend route
    });
});

// GET /api/v1/live-events/:eventCode
router.get("/live-events/:eventCode", async (req, res) => {
    const eventCode = String(req.params.eventCode ?? "").trim().toUpperCase();
    const ev = await LiveEventModel.findOne({ eventCode }).exec();

    if (!ev) return res.status(404).json({ message: "Live event not found" });

    return res.json({
        eventCode: ev.eventCode,
        name: ev.name,
        quizId: ev.quizId,
        status: ev.status,
        activeQuestionIndex: ev.activeQuestionIndex,
        questionVisible: ev.questionVisible,
        participantsCount: ev.participants.length,
    });
});

export default router;
