import express from "express";
import crypto from "crypto";
import { PgLiveEventRepository } from "../db/PgLiveEventRepository";
import { generateEventCode } from "../../../../shared/core/shortCode";

const router = express.Router();
const liveEventRepo = new PgLiveEventRepository();

// POST /api/v1/live-events
router.post("/live-events", async (req, res) => {
    const { quizId, name, sessionId } = req.body ?? {};
    const trimmedName = String(name ?? "").trim();
    const trimmedQuizId = String(quizId ?? "").trim();
    const trimmedSessionId = sessionId ? String(sessionId).trim() : null;

    if (!trimmedQuizId) return res.status(400).json({ message: "quizId is required" });
    if (!trimmedName) return res.status(400).json({ message: "name is required" });

    // generate unique readable code
    let eventCode = generateEventCode(6);
    for (let i = 0; i < 5; i++) {
        const exists = await liveEventRepo.findByEventCode(eventCode);
        if (!exists) break;
        eventCode = generateEventCode(6);
    }

    const adminToken = crypto.randomBytes(24).toString("hex");

    const created = await liveEventRepo.create({
        eventCode,
        name: trimmedName,
        quizId: trimmedQuizId,
        sessionId: trimmedSessionId,
        adminToken,
    });

    return res.status(201).json({
        eventCode: created.event_code,
        name: created.name,
        quizId: created.quiz_id,
        adminToken, // store client-side for admin controls
        joinPath: `/live/${created.event_code}`, // frontend route
    });
});

// GET /api/v1/live-events/:eventCode
router.get("/live-events/:eventCode", async (req, res) => {
    const eventCode = String(req.params.eventCode ?? "").trim().toUpperCase();
    const ev = await liveEventRepo.findByEventCode(eventCode);

    if (!ev) return res.status(404).json({ message: "Live event not found" });

    const participantsCount = await liveEventRepo.countParticipants(ev.id);

    return res.json({
        eventCode: ev.event_code,
        name: ev.name,
        quizId: ev.quiz_id,
        status: ev.status,
        activeQuestionIndex: ev.active_question_index,
        questionVisible: ev.question_visible,
        participantsCount,
    });
});

// POST /api/v1/live-events/:eventCode/end
router.post("/live-events/:eventCode/end", async (req, res) => {
    const eventCode = String(req.params.eventCode ?? "").trim().toUpperCase();
    const adminToken = String(req.body?.adminToken ?? "").trim();

    const ev = await liveEventRepo.findByEventCode(eventCode);
    if (!ev) return res.status(404).json({ message: "Live event not found" });
    if (ev.admin_token !== adminToken) return res.status(401).json({ message: "Unauthorized" });

    await liveEventRepo.endEvent(ev.id);

    return res.status(200).json({ eventCode: ev.event_code, status: "ended" });
});

export default router;
