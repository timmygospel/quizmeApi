import { Server, Socket } from "socket.io";
import { PgLiveEventRepository } from "../modules/liveEvents/infra/db/PgLiveEventRepository";
import crypto from "crypto";
import { redis } from "../shared/infra/redis/redisClient";

/* -----------------------------
   Types
------------------------------*/

type QuizOption = {
    text: string;
    correct: boolean;
};

type QuizQuestion = {
    question: string;
    options: QuizOption[];
    correctIndex: number;
};

type QuizSnapshot = {
    quizTitle: string;
    questions: QuizQuestion[];
};

type ActiveState = {
    activeQuestionIndex: number;
    questionVisible: boolean;
};

type AdminJoinPayload = {
    eventCode: string;
    adminToken: string;
    quizTitle: string;
    questions: any[];
};

type JoinPayload = {
    eventCode: string;
    name?: string;
};

type SetActivePayload = {
    eventCode: string;
    adminToken: string;
    questionIndex: number;
};

type ShowPayload = {
    eventCode: string;
    adminToken: string;
    visible: boolean;
};

type AnswerPayload = {
    eventCode: string;
    participantId: string;
    questionIndex: number;
    optionIndex: number;
};

/* -----------------------------
   Constants
------------------------------*/

const TTL = 86400; // 24 hours in seconds

const liveEventRepo = new PgLiveEventRepository();

/* -----------------------------
   Structured Logger
------------------------------*/

function log(
    level: "info" | "warn" | "error",
    msg: string,
    ctx: Record<string, unknown> = {}
) {
    const entry = JSON.stringify({
        ts: new Date().toISOString(),
        level,
        msg,
        ...ctx,
    });
    if (level === "error") console.error(entry);
    else if (level === "warn") console.warn(entry);
    else console.log(entry);
}

/* -----------------------------
   Redis Key Schema
------------------------------*/

const keys = {
    quiz: (code: string) => `event:${code}:quiz`,
    active: (code: string) => `event:${code}:active`,
    counts: (code: string, qIdx: number) =>
        `event:${code}:counts:${qIdx}`,
};

/* -----------------------------
   Helpers
------------------------------*/

const room = (eventCode: string) => `live:${eventCode}`;

function safeCode(code: string) {
    return String(code ?? "").trim().toUpperCase();
}

function toBool(x: any): boolean {
    return x === true || x === "true" || x === 1 || x === "1";
}

function normalizeQuestions(raw: any[]): QuizQuestion[] {
    return (raw ?? []).map((q) => {
        const options: QuizOption[] = (q?.options ?? []).map(
            (o: any): QuizOption => ({
                text: String(o?.text ?? ""),
                correct: toBool(o?.correct),
            })
        );

        const correctIndex = options.findIndex(
            (o: QuizOption) => o.correct === true
        );

        return {
            question: String(q?.question ?? ""),
            options,
            correctIndex,
        };
    });
}

/* -----------------------------
   In-memory fallback
------------------------------*/

const quizCache = new Map<string, QuizSnapshot>();

/* -----------------------------
   State Accessor Helpers
------------------------------*/

async function getQuizSnapshot(code: string): Promise<QuizSnapshot | null> {
    if (redis) {
        const raw = await redis.get(keys.quiz(code));
        if (!raw) return null;
        return JSON.parse(raw) as QuizSnapshot;
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

async function getActiveState(
    code: string,
    fallback: ActiveState
): Promise<ActiveState> {
    if (redis) {
        const raw = await redis.get(keys.active(code));
        if (!raw) return fallback;
        return JSON.parse(raw) as ActiveState;
    }
    return fallback;
}

async function setActiveState(code: string, state: ActiveState): Promise<void> {
    if (redis) {
        await redis.set(keys.active(code), JSON.stringify(state));
        await redis.expire(keys.active(code), TTL);
    }
}

async function computeResults(
    eventCode: string,
    liveEventId: string,
    qIdx: number,
    optionCount: number,
    correctIndex: number
): Promise<{
    countsByOption: number[];
    correctIndex: number;
    totalAnswers: number;
    correctCount: number;
    incorrectCount: number;
}> {
    let counts: number[];

    if (redis) {
        counts = new Array(optionCount).fill(0);
        const raw = await redis.hgetall(keys.counts(eventCode, qIdx));
        for (const [optStr, countStr] of Object.entries(raw ?? {})) {
            const idx = Number(optStr);
            const cnt = Number(countStr);
            if (!Number.isNaN(idx) && idx >= 0 && idx < counts.length) {
                counts[idx] = cnt;
            }
        }
    } else {
        counts = await liveEventRepo.getAnswerCountsByOption(liveEventId, qIdx, optionCount);
    }

    const total = counts.reduce((a: number, b: number) => a + b, 0);
    const correctCount = correctIndex >= 0 ? counts[correctIndex] : 0;
    const incorrectCount = total - correctCount;

    return {
        countsByOption: counts,
        correctIndex,
        totalAnswers: total,
        correctCount,
        incorrectCount,
    };
}

/* -----------------------------
   Socket Registration
------------------------------*/

export function registerLiveEventHandlers(io: Server) {
    io.on("connection", (socket: Socket) => {

        /* -----------------------------
           Participant Join
        ------------------------------*/
        socket.on(
            "event:join",
            async (payload: JoinPayload, cb?: Function) => {
                const eventCode = safeCode(payload.eventCode);
                const name = payload.name?.trim();

                const ev = await liveEventRepo.findByEventCode(eventCode);
                if (!ev || ev.status !== "live") {
                    cb?.({ ok: false, message: "Event not found or not live" });
                    return;
                }

                const participantId = crypto.randomBytes(10).toString("hex");

                socket.data.participantId = participantId;
                socket.data.eventCode = eventCode;
                socket.join(room(eventCode));

                await liveEventRepo.addParticipant(ev.id, participantId, name);
                const participantsCount = await liveEventRepo.countParticipants(ev.id);

                log("info", "participant joined", { eventCode, participantId });

                const quiz = await getQuizSnapshot(eventCode);
                const activeState = await getActiveState(eventCode, {
                    activeQuestionIndex: ev.active_question_index,
                    questionVisible: ev.question_visible,
                });

                // Send initial state
                io.to(socket.id).emit("event:state", {
                    eventCode,
                    name: ev.name,
                    status: ev.status,
                    quizTitle: quiz?.quizTitle,
                    activeQuestionIndex: activeState.activeQuestionIndex,
                    questionVisible: activeState.questionVisible,
                    participantId,
                });

                // Broadcast participants count
                io.to(room(eventCode)).emit("event:participantsCount", {
                    eventCode,
                    participantsCount,
                });

                // If question is active, send immediately
                const activeQ =
                    quiz?.questions?.[activeState.activeQuestionIndex];
                if (activeState.questionVisible && activeQ) {
                    io.to(socket.id).emit("event:question", {
                        eventCode,
                        activeQuestionIndex: activeState.activeQuestionIndex,
                        questionVisible: true,
                        question: {
                            question: activeQ.question,
                            options: activeQ.options.map((o) => ({
                                text: o.text,
                            })),
                        },
                    });

                    const results = await computeResults(
                        eventCode,
                        ev.id,
                        activeState.activeQuestionIndex,
                        activeQ.options.length,
                        activeQ.correctIndex
                    );

                    io.to(socket.id).emit("event:results", {
                        eventCode,
                        activeQuestionIndex: activeState.activeQuestionIndex,
                        ...results,
                    });
                }

                cb?.({ ok: true, participantId });
            }
        );

        /* -----------------------------
           Admin Join
        ------------------------------*/
        socket.on(
            "event:adminJoin",
            async (payload: AdminJoinPayload, cb?: Function) => {
                const eventCode = safeCode(payload.eventCode);

                const ev = await liveEventRepo.findByEventCode(eventCode);
                if (!ev || ev.admin_token !== payload.adminToken) {
                    cb?.({ ok: false, message: "Unauthorized" });
                    return;
                }

                const normalizedQuestions = normalizeQuestions(
                    payload.questions
                );

                const snapshot: QuizSnapshot = {
                    quizTitle: String(payload.quizTitle ?? ""),
                    questions: normalizedQuestions,
                };

                await setQuizSnapshot(eventCode, snapshot);
                await setActiveState(eventCode, {
                    activeQuestionIndex: ev.active_question_index,
                    questionVisible: ev.question_visible,
                });

                // Durable, immutable snapshot for post-event analytics.
                await liveEventRepo.saveQuestionSnapshot(
                    ev.id,
                    ev.quiz_id,
                    normalizedQuestions.map((q) => ({ question: q.question, options: q.options }))
                );

                socket.data.isAdmin = true;
                socket.data.eventCode = eventCode;
                socket.join(room(eventCode));

                log("info", "admin joined", { eventCode });

                cb?.({ ok: true });
            }
        );

        /* -----------------------------
           Set Active Question
        ------------------------------*/
        socket.on(
            "event:setActiveQuestion",
            async (payload: SetActivePayload) => {
                const eventCode = safeCode(payload.eventCode);

                const ev = await liveEventRepo.findByEventCode(eventCode);
                if (!ev || ev.admin_token !== payload.adminToken) return;

                const quiz = await getQuizSnapshot(eventCode);

                // Payload validation: bounds check
                if (
                    !quiz ||
                    payload.questionIndex < 0 ||
                    payload.questionIndex >= quiz.questions.length
                ) {
                    log("warn", "setActiveQuestion: out of bounds", {
                        eventCode,
                        questionIndex: payload.questionIndex,
                    });
                    return;
                }

                await liveEventRepo.setActiveQuestion(ev.id, payload.questionIndex, true);

                await setActiveState(eventCode, {
                    activeQuestionIndex: payload.questionIndex,
                    questionVisible: true,
                });

                log("info", "active question set", {
                    eventCode,
                    questionIndex: payload.questionIndex,
                });

                const q = quiz.questions[payload.questionIndex];

                io.to(room(eventCode)).emit("event:question", {
                    eventCode,
                    activeQuestionIndex: payload.questionIndex,
                    questionVisible: true,
                    question: {
                        question: q.question,
                        options: q.options.map((o) => ({
                            text: o.text,
                        })),
                    },
                });

                const results = await computeResults(
                    eventCode,
                    ev.id,
                    payload.questionIndex,
                    q.options.length,
                    q.correctIndex
                );

                io.to(room(eventCode)).emit("event:results", {
                    eventCode,
                    activeQuestionIndex: payload.questionIndex,
                    ...results,
                });
            }
        );

        /* -----------------------------
           Show / Hide Question
        ------------------------------*/
        socket.on(
            "event:showQuestion",
            async (payload: ShowPayload) => {
                const eventCode = safeCode(payload.eventCode);

                const ev = await liveEventRepo.findByEventCode(eventCode);
                if (!ev || ev.admin_token !== payload.adminToken) return;

                const visible = !!payload.visible;
                await liveEventRepo.setQuestionVisible(ev.id, visible);

                await setActiveState(eventCode, {
                    activeQuestionIndex: ev.active_question_index,
                    questionVisible: visible,
                });

                log("info", "question visibility changed", {
                    eventCode,
                    visible,
                });
            }
        );

        /* -----------------------------
           Participant Answer
        ------------------------------*/
        socket.on(
            "event:answer",
            async (payload: AnswerPayload, cb?: Function) => {
                const eventCode = safeCode(payload.eventCode);

                // Payload validation
                if (
                    !Number.isInteger(payload.optionIndex) ||
                    payload.optionIndex < 0
                ) {
                    cb?.({ ok: false, message: "Invalid optionIndex" });
                    return;
                }

                const ev = await liveEventRepo.findByEventCode(eventCode);
                if (!ev || ev.status !== "live") {
                    cb?.({ ok: false });
                    return;
                }

                const quiz = await getQuizSnapshot(eventCode);
                const q = quiz?.questions?.[payload.questionIndex];
                if (!q) return;

                // Payload validation: bounds check on optionIndex
                if (payload.optionIndex >= q.options.length) {
                    cb?.({ ok: false, message: "Invalid optionIndex" });
                    return;
                }

                const isCorrect = payload.optionIndex === q.correctIndex;

                // Postgres unique constraint is the atomic dedup gate — one
                // answer per participant per question.
                const recorded = await liveEventRepo.recordAnswer(
                    ev.id,
                    payload.participantId,
                    payload.questionIndex,
                    payload.optionIndex,
                    isCorrect
                );
                if (!recorded) {
                    cb?.({ ok: false, message: "Already answered" });
                    return;
                }

                if (redis) {
                    const countsKey = keys.counts(eventCode, payload.questionIndex);
                    await redis.hincrby(countsKey, String(payload.optionIndex), 1);
                    await redis.expire(countsKey, TTL);
                }

                log("info", "answer submitted", {
                    eventCode,
                    participantId: payload.participantId,
                    questionIndex: payload.questionIndex,
                });

                const results = await computeResults(
                    eventCode,
                    ev.id,
                    payload.questionIndex,
                    q.options.length,
                    q.correctIndex
                );

                io.to(room(eventCode)).emit("event:results", {
                    eventCode,
                    activeQuestionIndex: payload.questionIndex,
                    ...results,
                });

                cb?.({ ok: true });
            }
        );
    });
}
