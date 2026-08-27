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

// Ephemeral, per-event real-time state. `activeQuestionIndex` and
// `questionVisible` are also persisted to Postgres (see liveEventRepo) as
// the durable fallback; `locked`/`revealed`/`paused` have no DB column —
// they're intentionally volatile. A mid-session server restart resetting
// them to "not locked / not revealed / not paused" is an acceptable
// degradation for a live session.
type ActiveState = {
    activeQuestionIndex: number;
    questionVisible: boolean;
    locked: boolean;
    revealed: boolean;
    paused: boolean;
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
    // Present when the client is silently rejoining after a dropped
    // connection (tunnel blip, backgrounded tab) — lets us re-attach to the
    // existing roster row instead of creating a duplicate participant.
    participantId?: string;
};

type SetActivePayload = {
    eventCode: string;
    adminToken: string;
    questionIndex: number;
};

type AdminActionPayload = {
    eventCode: string;
    adminToken: string;
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

const DEFAULT_ACTIVE_STATE: ActiveState = {
    activeQuestionIndex: 0,
    questionVisible: false,
    locked: false,
    revealed: false,
    paused: false,
};

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
// Admin-only channel — the participant roster (names) goes here, never to
// the general room, so participants' own sockets never receive everyone
// else's name.
const adminRoom = (eventCode: string) => `live:${eventCode}:admin`;

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
   In-memory fallback (single-instance dev / no Redis configured)
------------------------------*/

const quizCache = new Map<string, QuizSnapshot>();
const activeStateCache = new Map<string, ActiveState>();

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
        return { ...fallback, ...JSON.parse(raw) } as ActiveState;
    }
    return activeStateCache.get(code) ?? fallback;
}

// Partial update — merges onto whatever's already stored (falling back to
// DEFAULT_ACTIVE_STATE) so callers only need to specify the fields they're
// actually changing.
async function patchActiveState(code: string, patch: Partial<ActiveState>): Promise<ActiveState> {
    const current = await getActiveState(code, DEFAULT_ACTIVE_STATE);
    const next: ActiveState = { ...current, ...patch };
    if (redis) {
        await redis.set(keys.active(code), JSON.stringify(next));
        await redis.expire(keys.active(code), TTL);
    } else {
        activeStateCache.set(code, next);
    }
    return next;
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

// Participants never receive `correct` flags (or a usable correctIndex)
// until the host has revealed the answer.
function publicQuestion(q: QuizQuestion, revealed: boolean) {
    return {
        question: q.question,
        options: q.options.map((o) =>
            revealed ? { text: o.text, correct: o.correct } : { text: o.text }
        ),
        ...(revealed ? { correctIndex: q.correctIndex } : {}),
    };
}

function emitQuestionState(
    io: Server,
    target: string,
    eventCode: string,
    state: ActiveState,
    quiz: QuizSnapshot | null
) {
    const q = quiz?.questions?.[state.activeQuestionIndex];
    io.to(target).emit("event:question", {
        eventCode,
        activeQuestionIndex: state.activeQuestionIndex,
        questionVisible: state.questionVisible,
        locked: state.locked,
        revealed: state.revealed,
        question: q ? publicQuestion(q, state.revealed) : null,
    });
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

                // Reuse the client's previously-issued participantId if it's
                // still valid for this event (a genuine reconnect); otherwise
                // this is a first-time join and gets a fresh one.
                const isReconnect =
                    !!payload.participantId &&
                    (await liveEventRepo.participantExists(ev.id, payload.participantId));
                const participantId = isReconnect
                    ? (payload.participantId as string)
                    : crypto.randomBytes(10).toString("hex");

                socket.data.participantId = participantId;
                socket.data.eventCode = eventCode;
                socket.join(room(eventCode));

                await liveEventRepo.addParticipant(ev.id, participantId, name);
                const participantsCount = await liveEventRepo.countParticipants(ev.id);
                const participants = await liveEventRepo.listParticipants(ev.id);

                log("info", "participant joined", { eventCode, participantId });

                // Admin-only — never sent to the general room.
                io.to(adminRoom(eventCode)).emit("event:participants", {
                    eventCode,
                    participants: participants.map((p) => ({
                        participantId: p.participantId,
                        name: p.name,
                        joinedAt: p.joinedAt.toISOString(),
                    })),
                });

                const quiz = await getQuizSnapshot(eventCode);
                const activeState = await getActiveState(eventCode, {
                    ...DEFAULT_ACTIVE_STATE,
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
                    locked: activeState.locked,
                    revealed: activeState.revealed,
                    paused: activeState.paused,
                    participantId,
                });

                // Broadcast participants count
                io.to(room(eventCode)).emit("event:participantsCount", {
                    eventCode,
                    participantsCount,
                });

                // If question is active, send immediately
                const activeQ = quiz?.questions?.[activeState.activeQuestionIndex];
                if (activeState.questionVisible && activeQ) {
                    emitQuestionState(io, socket.id, eventCode, activeState, quiz);

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
                await patchActiveState(eventCode, {
                    activeQuestionIndex: ev.active_question_index,
                    questionVisible: ev.question_visible,
                    locked: false,
                    revealed: false,
                    paused: false,
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
                socket.join(adminRoom(eventCode));

                log("info", "admin joined", { eventCode });

                const participants = await liveEventRepo.listParticipants(ev.id);
                cb?.({
                    ok: true,
                    participants: participants.map((p) => ({
                        participantId: p.participantId,
                        name: p.name,
                        joinedAt: p.joinedAt.toISOString(),
                    })),
                });
            }
        );

        /* -----------------------------
           Open a question (advance to it and show it).
           Used for the very first question and every "Next Question" /
           sidebar jump after that — there's no separate "select, then
           press Start" step once the session is under way.
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

                const state = await patchActiveState(eventCode, {
                    activeQuestionIndex: payload.questionIndex,
                    questionVisible: true,
                    locked: false,
                    revealed: false,
                });

                log("info", "question opened", {
                    eventCode,
                    questionIndex: payload.questionIndex,
                });

                emitQuestionState(io, room(eventCode), eventCode, state, quiz);
            }
        );

        /* -----------------------------
           Close voting — freezes answers but keeps the question on
           screen (participants keep seeing it, just can't answer).
        ------------------------------*/
        socket.on(
            "event:closeVoting",
            async (payload: AdminActionPayload) => {
                const eventCode = safeCode(payload.eventCode);

                const ev = await liveEventRepo.findByEventCode(eventCode);
                if (!ev || ev.admin_token !== payload.adminToken) return;

                const quiz = await getQuizSnapshot(eventCode);
                const state = await patchActiveState(eventCode, { locked: true });

                log("info", "voting closed", { eventCode });

                emitQuestionState(io, room(eventCode), eventCode, state, quiz);
            }
        );

        /* -----------------------------
           Reveal the correct answer — participants get told which
           option (if any) was correct.
        ------------------------------*/
        socket.on(
            "event:revealAnswer",
            async (payload: AdminActionPayload) => {
                const eventCode = safeCode(payload.eventCode);

                const ev = await liveEventRepo.findByEventCode(eventCode);
                if (!ev || ev.admin_token !== payload.adminToken) return;

                const quiz = await getQuizSnapshot(eventCode);
                const state = await patchActiveState(eventCode, { locked: true, revealed: true });

                log("info", "answer revealed", { eventCode });

                emitQuestionState(io, room(eventCode), eventCode, state, quiz);
            }
        );

        /* -----------------------------
           Pause / Resume — blocks answers session-wide without
           touching which question is on screen.
        ------------------------------*/
        socket.on(
            "event:pause",
            async (payload: AdminActionPayload) => {
                const eventCode = safeCode(payload.eventCode);

                const ev = await liveEventRepo.findByEventCode(eventCode);
                if (!ev || ev.admin_token !== payload.adminToken) return;

                await patchActiveState(eventCode, { paused: true });
                log("info", "session paused", { eventCode });
                io.to(room(eventCode)).emit("event:paused", { eventCode, paused: true });
            }
        );

        socket.on(
            "event:resume",
            async (payload: AdminActionPayload) => {
                const eventCode = safeCode(payload.eventCode);

                const ev = await liveEventRepo.findByEventCode(eventCode);
                if (!ev || ev.admin_token !== payload.adminToken) return;

                await patchActiveState(eventCode, { paused: false });
                log("info", "session resumed", { eventCode });
                io.to(room(eventCode)).emit("event:paused", { eventCode, paused: false });
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

                const state = await getActiveState(eventCode, DEFAULT_ACTIVE_STATE);
                if (state.paused) {
                    cb?.({ ok: false, message: "Session is paused" });
                    return;
                }
                if (state.locked) {
                    cb?.({ ok: false, message: "Voting is closed for this question" });
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

                // Admin-only — never sent to the general room, so
                // participants never see who else answered wrong.
                if (!isCorrect) {
                    const incorrectParticipants = await liveEventRepo.getIncorrectParticipants(
                        ev.id,
                        payload.questionIndex
                    );
                    io.to(adminRoom(eventCode)).emit("event:incorrectAnswers", {
                        eventCode,
                        questionIndex: payload.questionIndex,
                        participants: incorrectParticipants,
                    });
                }

                cb?.({ ok: true });
            }
        );
    });
}
