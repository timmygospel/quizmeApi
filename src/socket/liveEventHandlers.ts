import { Server, Socket } from "socket.io";
import { LiveEventModel } from "../modules/liveEvents/infra/db/LiveEventModel";
import crypto from "crypto";

type QuizQuestion = {
    question: string;
    options: { text: string; correct: boolean }[];
    correctIndex: number;
};

type AdminJoinPayload = {
    eventCode: string;
    adminToken: string;
    quizTitle: string;
    questions: any[];
};

type JoinPayload = { eventCode: string; name?: string };
type SetActivePayload = { eventCode: string; adminToken: string; questionIndex: number };
type ShowPayload = { eventCode: string; adminToken: string; visible: boolean };
type AnswerPayload = {
    eventCode: string;
    participantId: string;
    questionIndex: number;
    optionIndex: number;
};

const room = (eventCode: string) => `live:${eventCode}`;

function safeCode(code: string) {
    return String(code ?? "").trim().toUpperCase();
}

function toBool(x: any): boolean {
    return x === true || x === "true" || x === 1 || x === "1";
}

function normalizeQuestions(raw: any[]): QuizQuestion[] {
    return (raw ?? []).map((q) => {
        const options = (q.options ?? []).map((o: any) => ({
            text: String(o.text ?? ""),
            correct: toBool(o.correct),
        }));

        const correctIndex = options.findIndex((o) => o.correct === true);

        return {
            question: String(q.question ?? ""),
            options,
            correctIndex,
        };
    });
}

function computeResults(q: QuizQuestion, answersForQuestion: Record<string, number>) {
    const counts = new Array(q.options.length).fill(0);

    Object.values(answersForQuestion ?? {}).forEach((optIdx) => {
        const idx = Number(optIdx);
        if (!Number.isNaN(idx) && idx >= 0 && idx < counts.length) {
            counts[idx] += 1;
        }
    });

    const total = counts.reduce((a, b) => a + b, 0);
    const correctCount = q.correctIndex >= 0 ? counts[q.correctIndex] : 0;
    const incorrectCount = total - correctCount;

    return {
        countsByOption: counts,
        correctIndex: q.correctIndex,
        totalAnswers: total,
        correctCount,
        incorrectCount,
    };
}

export function registerLiveEventHandlers(io: Server) {

    // ✅ MUST be here
    const quizCache = new Map<
        string,
        { quizTitle: string; questions: QuizQuestion[] }
    >();

    io.on("connection", (socket: Socket) => {

        socket.on("event:join", async (payload: JoinPayload, cb?: Function) => {
            const eventCode = safeCode(payload.eventCode);
            const name = payload.name?.trim();

            const ev = await LiveEventModel.findOne({ eventCode }).exec();
            if (!ev || ev.status !== "live") {
                cb?.({ ok: false, message: "Event not found or not live" });
                return;
            }

            const participantId = crypto.randomBytes(10).toString("hex");

            socket.data.participantId = participantId;
            socket.data.eventCode = eventCode;
            socket.join(room(eventCode));

            ev.participants.push({ participantId, name, joinedAt: new Date() });
            await ev.save();

            const quiz = quizCache.get(eventCode);

            io.to(socket.id).emit("event:state", {
                eventCode,
                name: ev.name,
                status: ev.status,
                quizTitle: quiz?.quizTitle,
                activeQuestionIndex: ev.activeQuestionIndex,
                questionVisible: ev.questionVisible,
                participantId,
            });

            io.to(room(eventCode)).emit("event:participantsCount", {
                eventCode,
                participantsCount: ev.participants.length,
            });

            const activeQ = quiz?.questions?.[ev.activeQuestionIndex];
            if (ev.questionVisible && activeQ) {
                io.to(socket.id).emit("event:question", {
                    eventCode,
                    activeQuestionIndex: ev.activeQuestionIndex,
                    questionVisible: true,
                    question: {
                        question: activeQ.question,
                        options: activeQ.options.map((o) => ({ text: o.text })),
                    },
                });

                const answersForQ = ev.answers[String(ev.activeQuestionIndex)] ?? {};
                io.to(socket.id).emit("event:results", {
                    eventCode,
                    activeQuestionIndex: ev.activeQuestionIndex,
                    ...computeResults(activeQ, answersForQ),
                });
            }

            cb?.({ ok: true, participantId });
        });

        socket.on("event:adminJoin", async (payload: AdminJoinPayload, cb?: Function) => {
            const eventCode = safeCode(payload.eventCode);

            const ev = await LiveEventModel.findOne({ eventCode }).exec();
            if (!ev || ev.adminToken !== payload.adminToken) {
                cb?.({ ok: false, message: "Unauthorized" });
                return;
            }

            const normalizedQuestions = normalizeQuestions(payload.questions);

            quizCache.set(eventCode, {
                quizTitle: String(payload.quizTitle ?? ""),
                questions: normalizedQuestions,
            });

            socket.data.isAdmin = true;
            socket.data.eventCode = eventCode;
            socket.join(room(eventCode));

            cb?.({ ok: true });
        });

        socket.on("event:setActiveQuestion", async (payload: SetActivePayload) => {
            const eventCode = safeCode(payload.eventCode);
            const ev = await LiveEventModel.findOne({ eventCode }).exec();
            if (!ev || ev.adminToken !== payload.adminToken) return;

            ev.activeQuestionIndex = payload.questionIndex;
            ev.questionVisible = true;
            await ev.save();

            const quiz = quizCache.get(eventCode);
            const q = quiz?.questions?.[payload.questionIndex];
            if (!q) return;

            io.to(room(eventCode)).emit("event:question", {
                eventCode,
                activeQuestionIndex: payload.questionIndex,
                questionVisible: true,
                question: {
                    question: q.question,
                    options: q.options.map((o) => ({ text: o.text })),
                },
            });

            const answersForQ = ev.answers[String(payload.questionIndex)] ?? {};
            io.to(room(eventCode)).emit("event:results", {
                eventCode,
                activeQuestionIndex: payload.questionIndex,
                ...computeResults(q, answersForQ),
            });
        });

        socket.on("event:answer", async (payload: AnswerPayload, cb?: Function) => {
            const eventCode = safeCode(payload.eventCode);
            const ev = await LiveEventModel.findOne({ eventCode }).exec();
            if (!ev || ev.status !== "live") {
                cb?.({ ok: false });
                return;
            }

            const quiz = quizCache.get(eventCode);
            const q = quiz?.questions?.[payload.questionIndex];
            if (!q) return;

            const key = String(payload.questionIndex);
            if (!ev.answers[key]) ev.answers[key] = {};
            ev.answers[key][payload.participantId] = payload.optionIndex;

            ev.markModified("answers");
            await ev.save();

            const answersForQ = ev.answers[key];
            io.to(room(eventCode)).emit("event:results", {
                eventCode,
                activeQuestionIndex: payload.questionIndex,
                ...computeResults(q, answersForQ),
            });

            cb?.({ ok: true });
        });
    });
}
