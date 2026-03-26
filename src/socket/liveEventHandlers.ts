import { Server, Socket } from "socket.io";
import crypto from "crypto";
import { prisma } from "../shared/infra/prisma/prismaClient";
import { redis } from "../shared/infra/redis/redisClient";
import { syncSession, createAttempt, saveAnswer } from "./prismaSessionSync";
import { FinaliseAttemptUseCase } from "../modules/dashboard/application/scoring/FinaliseAttemptUseCase";

/* -----------------------------
   Types
------------------------------*/

type QuizOption = { text: string; correct: boolean };
type QuizQuestion = { question: string; options: QuizOption[]; correctIndex: number };
type QuizSnapshot = { quizTitle: string; questions: QuizQuestion[] };
type ActiveState = { activeQuestionIndex: number; questionVisible: boolean };

type AdminJoinPayload = {
    eventCode: string;
    adminToken: string;
    quizTitle: string;
    questions: any[];
};

type JoinPayload = { eventCode: string; name?: string };
type SetActivePayload = { eventCode: string; adminToken: string; questionIndex: number };
type ShowPayload = { eventCode: string; adminToken: string; visible: boolean };
type AnswerPayload = { eventCode: string; participantId: string; questionIndex: number; optionIndex: number };
type FullQuizSubmitPayload = {
    eventCode: string;
    answers: Array<{ questionIndex: number; optionIndex: number }>;
};

/* -----------------------------
   Constants
------------------------------*/

const TTL = 86400; // 24 hours

/* -----------------------------
   Structured Logger
------------------------------*/

function log(level: "info" | "warn" | "error", msg: string, ctx: Record<string, unknown> = {}) {
    const entry = JSON.stringify({ ts: new Date().toISOString(), level, msg, ...ctx });
    if (level === "error") console.error(entry);
    else if (level === "warn") console.warn(entry);
    else console.log(entry);
}

/* -----------------------------
   Redis Key Schema
------------------------------*/

const keys = {
    quiz:         (code: string) => `event:${code}:quiz`,
    active:       (code: string) => `event:${code}:active`,
    answers:      (code: string, qIdx: number) => `event:${code}:answers:${qIdx}`,
    counts:       (code: string, qIdx: number) => `event:${code}:counts:${qIdx}`,
    participants: (code: string) => `event:${code}:participants`,
};

/* -----------------------------
   Helpers
------------------------------*/

const room = (eventCode: string) => `live:${eventCode}`;

function safeCode(code: string) { return String(code ?? "").trim().toUpperCase(); }
function toBool(x: any): boolean { return x === true || x === "true" || x === 1 || x === "1"; }

function normalizeQuestions(raw: any[]): QuizQuestion[] {
    return (raw ?? []).map((q) => {
        const options: QuizOption[] = (q?.options ?? []).map((o: any): QuizOption => ({
            text: String(o?.text ?? ""),
            correct: toBool(o?.correct),
        }));
        return {
            question: String(q?.question ?? ""),
            options,
            correctIndex: options.findIndex((o) => o.correct === true),
        };
    });
}

/* -----------------------------
   In-memory fallback (no Redis)
------------------------------*/

const quizCache = new Map<string, QuizSnapshot>();

async function getQuizSnapshot(code: string): Promise<QuizSnapshot | null> {
    if (redis) {
        const raw = await redis.get(keys.quiz(code));
        return raw ? JSON.parse(raw) : null;
    }
    return quizCache.get(code) ?? null;
}

async function setQuizSnapshot(code: string, snapshot: QuizSnapshot): Promise<void> {
    if (redis) {
        await redis.set(keys.quiz(code), JSON.stringify(snapshot));
        await redis.expire(keys.quiz(code), TTL);
    } else {
        quizCache.set(code, snapshot);
    }
}

async function getActiveState(code: string, fallback: ActiveState): Promise<ActiveState> {
    if (redis) {
        const raw = await redis.get(keys.active(code));
        return raw ? (JSON.parse(raw) as ActiveState) : fallback;
    }
    return fallback;
}

async function setActiveState(code: string, state: ActiveState): Promise<void> {
    if (redis) {
        await redis.set(keys.active(code), JSON.stringify(state));
        await redis.expire(keys.active(code), TTL);
    }
}

async function computeResultsFromRedis(
    code: string,
    qIdx: number,
    optionCount: number,
    correctIndex: number,
) {
    const counts = new Array(optionCount).fill(0);
    if (redis) {
        const raw = await redis.hgetall(keys.counts(code, qIdx));
        for (const [optStr, countStr] of Object.entries(raw ?? {})) {
            const idx = Number(optStr);
            const cnt = Number(countStr);
            if (!Number.isNaN(idx) && idx >= 0 && idx < counts.length) counts[idx] = cnt;
        }
    }
    const total = counts.reduce((a: number, b: number) => a + b, 0);
    const correctCount = correctIndex >= 0 ? counts[correctIndex] : 0;
    return { countsByOption: counts, correctIndex, totalAnswers: total, correctCount, incorrectCount: total - correctCount };
}

/* -----------------------------
   Socket Registration
------------------------------*/

export function registerLiveEventHandlers(io: Server) {
    io.on("connection", (socket: Socket) => {

        /* -----------------------------
           Participant Join
        ------------------------------*/
        socket.on("event:join", async (payload: JoinPayload, cb?: Function) => {
            const eventCode = safeCode(payload.eventCode);
            const name = payload.name?.trim();

            const session = await prisma.quizSession.findUnique({ where: { eventCode } });
            if (!session || session.status !== "ACTIVE") {
                cb?.({ ok: false, message: "Event not found or not active" });
                return;
            }

            const participantId = crypto.randomBytes(10).toString("hex");
            const displayName = name ?? participantId;

            socket.data.participantId = participantId;
            socket.data.eventCode = eventCode;
            socket.data.displayName = displayName;
            socket.join(room(eventCode));

            // Track participant count in Redis (or fall back to DB count)
            let participantsCount = 1;
            if (redis) {
                participantsCount = await redis.incr(keys.participants(eventCode));
                await redis.expire(keys.participants(eventCode), TTL);
            } else {
                participantsCount = await prisma.attempt.count({ where: { session: { eventCode } } }) + 1;
            }

            // Create Prisma Attempt (fire-and-forget)
            createAttempt(eventCode, displayName).then((attemptId) => {
                if (attemptId) socket.data.attemptId = attemptId;
            }).catch(() => {/* already logged */});

            log("info", "participant joined", { eventCode, participantId });

            const quiz = await getQuizSnapshot(eventCode);
            const activeState = await getActiveState(eventCode, {
                activeQuestionIndex: session.activeQuestionIndex,
                questionVisible: session.questionVisible,
            });

            io.to(socket.id).emit("event:state", {
                eventCode,
                name: session.name,
                status: "live",
                quizTitle: quiz?.quizTitle,
                activeQuestionIndex: activeState.activeQuestionIndex,
                questionVisible: activeState.questionVisible,
                participantId,
            });

            io.to(room(eventCode)).emit("event:participantsCount", { eventCode, participantsCount });

            const activeQ = quiz?.questions?.[activeState.activeQuestionIndex];
            if (activeState.questionVisible && activeQ) {
                io.to(socket.id).emit("event:question", {
                    eventCode,
                    activeQuestionIndex: activeState.activeQuestionIndex,
                    questionVisible: true,
                    question: { question: activeQ.question, options: activeQ.options.map((o) => ({ text: o.text })) },
                });

                const results = await computeResultsFromRedis(
                    eventCode,
                    activeState.activeQuestionIndex,
                    activeQ.options.length,
                    activeQ.correctIndex,
                );
                io.to(socket.id).emit("event:results", { eventCode, activeQuestionIndex: activeState.activeQuestionIndex, ...results });
            }

            cb?.({ ok: true, participantId });
        });

        /* -----------------------------
           Admin Join
        ------------------------------*/
        socket.on("event:adminJoin", async (payload: AdminJoinPayload, cb?: Function) => {
            const eventCode = safeCode(payload.eventCode);

            const session = await prisma.quizSession.findUnique({ where: { eventCode } });
            if (!session || session.adminToken !== payload.adminToken) {
                cb?.({ ok: false, message: "Unauthorized" });
                return;
            }

            const normalizedQuestions = normalizeQuestions(payload.questions);
            const snapshot: QuizSnapshot = {
                quizTitle: String(payload.quizTitle ?? ""),
                questions: normalizedQuestions,
            };

            await setQuizSnapshot(eventCode, snapshot);
            await setActiveState(eventCode, {
                activeQuestionIndex: session.activeQuestionIndex,
                questionVisible: session.questionVisible,
            });

            socket.data.isAdmin = true;
            socket.data.eventCode = eventCode;
            socket.join(room(eventCode));

            log("info", "admin joined", { eventCode });

            // Sync to Prisma (fire-and-forget)
            syncSession(eventCode, snapshot.quizTitle, normalizedQuestions).catch(() => {/* already logged */});

            cb?.({ ok: true });
        });

        /* -----------------------------
           Set Active Question
        ------------------------------*/
        socket.on("event:setActiveQuestion", async (payload: SetActivePayload) => {
            const eventCode = safeCode(payload.eventCode);

            const session = await prisma.quizSession.findUnique({ where: { eventCode } });
            if (!session || session.adminToken !== payload.adminToken) return;

            const quiz = await getQuizSnapshot(eventCode);
            if (!quiz || payload.questionIndex < 0 || payload.questionIndex >= quiz.questions.length) {
                log("warn", "setActiveQuestion: out of bounds", { eventCode, questionIndex: payload.questionIndex });
                return;
            }

            await prisma.quizSession.update({
                where: { eventCode },
                data: { activeQuestionIndex: payload.questionIndex, questionVisible: true },
            });

            await setActiveState(eventCode, { activeQuestionIndex: payload.questionIndex, questionVisible: true });

            log("info", "active question set", { eventCode, questionIndex: payload.questionIndex });

            const q = quiz.questions[payload.questionIndex];
            io.to(room(eventCode)).emit("event:question", {
                eventCode,
                activeQuestionIndex: payload.questionIndex,
                questionVisible: true,
                question: { question: q.question, options: q.options.map((o) => ({ text: o.text })) },
            });

            const results = await computeResultsFromRedis(eventCode, payload.questionIndex, q.options.length, q.correctIndex);
            io.to(room(eventCode)).emit("event:results", { eventCode, activeQuestionIndex: payload.questionIndex, ...results });
        });

        /* -----------------------------
           Show / Hide Question
        ------------------------------*/
        socket.on("event:showQuestion", async (payload: ShowPayload) => {
            const eventCode = safeCode(payload.eventCode);

            const session = await prisma.quizSession.findUnique({ where: { eventCode } });
            if (!session || session.adminToken !== payload.adminToken) return;

            const questionVisible = !!payload.visible;
            await prisma.quizSession.update({ where: { eventCode }, data: { questionVisible } });
            await setActiveState(eventCode, { activeQuestionIndex: session.activeQuestionIndex, questionVisible });

            log("info", "question visibility changed", { eventCode, visible: questionVisible });
        });

        /* -----------------------------
           Full Quiz Mode — Bulk Submit
        ------------------------------*/
        socket.on("event:submitFullQuiz", async (payload: FullQuizSubmitPayload, cb?: Function) => {
            const { eventCode, answers } = payload ?? {};
            const { attemptId } = socket.data;

            if (!attemptId) { cb?.({ ok: false, message: "No active attempt — join the event first" }); return; }
            if (!Array.isArray(answers) || answers.length === 0) { cb?.({ ok: false, message: "answers array is required" }); return; }

            try {
                const snapshotRaw = redis ? await redis.get(`event:${eventCode}:quiz`) : null;
                const snapshot: QuizSnapshot | null = snapshotRaw ? JSON.parse(snapshotRaw) : null;

                for (const ans of answers) {
                    const q = snapshot?.questions?.[ans.questionIndex];
                    const isCorrect = q ? ans.optionIndex === q.correctIndex : false;
                    await saveAnswer({ eventCode, attemptId, questionIndex: ans.questionIndex, optionIndex: ans.optionIndex, isCorrect });
                }

                const result = await new FinaliseAttemptUseCase().execute({ attemptId });
                log("info", "full quiz submitted", { eventCode, attemptId, totalScore: result.totalScore });
                cb?.({ ok: true, ...result });
            } catch (err: any) {
                log("error", "submitFullQuiz failed", { attemptId, err: String(err) });
                cb?.({ ok: false, message: "Failed to submit quiz" });
            }
        });

        /* -----------------------------
           Participant Finish
        ------------------------------*/
        socket.on("event:finish", async (_payload: unknown, cb?: Function) => {
            const { attemptId } = socket.data;
            if (!attemptId) { cb?.({ ok: false, message: "No active attempt" }); return; }
            try {
                const result = await new FinaliseAttemptUseCase().execute({ attemptId });
                log("info", "attempt finalised", { attemptId, totalScore: result.totalScore });
                cb?.({ ok: true, ...result });
            } catch (err: any) {
                log("error", "finalise attempt failed", { attemptId, err: String(err) });
                cb?.({ ok: false, message: "Failed to finalise attempt" });
            }
        });

        /* -----------------------------
           Participant Answer
        ------------------------------*/
        socket.on("event:answer", async (payload: AnswerPayload, cb?: Function) => {
            const eventCode = safeCode(payload.eventCode);

            if (!Number.isInteger(payload.optionIndex) || payload.optionIndex < 0) {
                cb?.({ ok: false, message: "Invalid optionIndex" });
                return;
            }

            const session = await prisma.quizSession.findUnique({ where: { eventCode } });
            if (!session || session.status !== "ACTIVE") {
                cb?.({ ok: false });
                return;
            }

            const quiz = await getQuizSnapshot(eventCode);
            const q = quiz?.questions?.[payload.questionIndex];
            if (!q) return;

            if (payload.optionIndex >= q.options.length) {
                cb?.({ ok: false, message: "Invalid optionIndex" });
                return;
            }

            const answersKey = keys.answers(eventCode, payload.questionIndex);
            const countsKey  = keys.counts(eventCode, payload.questionIndex);

            if (redis) {
                // Rate-limit: one answer per participant per question
                const alreadyAnswered = await redis.hexists(answersKey, payload.participantId);
                if (alreadyAnswered) { cb?.({ ok: false, message: "Already answered" }); return; }

                await redis.hset(answersKey, payload.participantId, String(payload.optionIndex));
                await redis.expire(answersKey, TTL);
                await redis.hincrby(countsKey, String(payload.optionIndex), 1);
                await redis.expire(countsKey, TTL);
            }

            log("info", "answer submitted", { eventCode, participantId: payload.participantId, questionIndex: payload.questionIndex });

            // Persist to Prisma (fire-and-forget)
            if (socket.data.attemptId) {
                const isCorrect = payload.optionIndex === q.correctIndex;
                saveAnswer({ eventCode, attemptId: socket.data.attemptId, questionIndex: payload.questionIndex, optionIndex: payload.optionIndex, isCorrect }).catch(() => {/* already logged */});
            }

            const results = await computeResultsFromRedis(eventCode, payload.questionIndex, q.options.length, q.correctIndex);
            io.to(room(eventCode)).emit("event:results", { eventCode, activeQuestionIndex: payload.questionIndex, ...results });

            cb?.({ ok: true });
        });
    });
}
