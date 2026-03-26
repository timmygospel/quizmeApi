/**
 * prismaSessionSync.ts
 *
 * Bridges Socket.IO live-event lifecycle to the Prisma PostgreSQL store so that
 * the dashboard analytics endpoints have data to query.
 *
 * All functions are fire-and-forget safe: they swallow errors and log them so
 * that a Prisma failure never crashes the socket handler.
 */

import { prisma } from "../shared/infra/prisma/prismaClient";

type RawOption = { text: string; correct: boolean };
type RawQuestion = { question: string; options: RawOption[]; correctIndex: number };

export type QuizConfig = {
    mode?: "LIVE" | "FULL";
    passRateEnabled?: boolean;
    passingScore?: number;
    timed?: boolean;
    timeLimitSeconds?: number | null;
    feedbackEnabled?: boolean;
    feedbackShowScore?: boolean;
    feedbackShowPassFail?: boolean;
};

function log(msg: string, ctx: Record<string, unknown> = {}) {
    console.log(JSON.stringify({ ts: new Date().toISOString(), level: "info", msg, ...ctx }));
}

function logErr(msg: string, err: unknown) {
    console.error(JSON.stringify({ ts: new Date().toISOString(), level: "error", msg, err: String(err) }));
}

// ---------------------------------------------------------------------------
// syncSession
//   Called from event:adminJoin.
//   Upserts Quiz + Questions + Options in Prisma and links them to the session.
//   Returns the Prisma QuizSession id.
// ---------------------------------------------------------------------------
export async function syncSession(
    eventCode: string,
    quizTitle: string,
    questions: RawQuestion[],
    config: QuizConfig = {},
): Promise<string | null> {
    try {
        const session = await prisma.quizSession.findUnique({
            where: { eventCode },
            select: { id: true, quizId: true },
        });
        if (!session) return null;

        const quizData = {
            title: quizTitle,
            totalQuestions: questions.length,
            mode: config.mode ?? ("LIVE" as const),
            passRateEnabled: config.passRateEnabled ?? false,
            passingScore: config.passingScore ?? 70,
            timed: config.timed ?? false,
            timeLimitSeconds: config.timeLimitSeconds ?? null,
            feedbackEnabled: config.feedbackEnabled ?? false,
            feedbackShowScore: config.feedbackShowScore ?? false,
            feedbackShowPassFail: config.feedbackShowPassFail ?? false,
        };

        let quizId = session.quizId;

        if (quizId) {
            await prisma.quiz.update({ where: { id: quizId }, data: quizData });
        } else {
            const quiz = await prisma.quiz.create({ data: quizData });
            quizId = quiz.id;
        }

        // Upsert questions + options
        for (let qi = 0; qi < questions.length; qi++) {
            const raw = questions[qi];
            const question = await prisma.question.upsert({
                where: { quizId_index: { quizId: quizId!, index: qi } },
                create: { quizId: quizId!, text: raw.question, index: qi },
                update: { text: raw.question },
            });

            for (let oi = 0; oi < raw.options.length; oi++) {
                await prisma.option.upsert({
                    where: { questionId_index: { questionId: question.id, index: oi } },
                    create: {
                        questionId: question.id,
                        text: raw.options[oi].text,
                        isCorrect: raw.options[oi].correct,
                        index: oi,
                    },
                    update: {
                        text: raw.options[oi].text,
                        isCorrect: raw.options[oi].correct,
                    },
                });
            }
        }

        // Update session: link quiz, set title and ACTIVE status
        await prisma.quizSession.update({
            where: { eventCode },
            data: { quizId: quizId!, title: quizTitle, status: "ACTIVE" },
        });

        log("prisma session synced", { eventCode, sessionId: session.id });
        return session.id;
    } catch (err) {
        logErr("syncSession failed", err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// createAttempt
//   Called from event:join.
//   Creates an Attempt row and returns its id (or null on failure).
// ---------------------------------------------------------------------------
export async function createAttempt(
    eventCode: string,
    displayName: string,
): Promise<string | null> {
    try {
        const session = await prisma.quizSession.findUnique({
            where: { eventCode },
            select: { id: true },
        });
        if (!session) return null;

        const attempt = await prisma.attempt.upsert({
            where: { sessionId_displayName: { sessionId: session.id, displayName } },
            create: { sessionId: session.id, displayName, status: "IN_PROGRESS" },
            update: { status: "IN_PROGRESS" },
        });

        log("attempt created", { eventCode, attemptId: attempt.id, displayName });
        return attempt.id;
    } catch (err) {
        logErr("createAttempt failed", err);
        return null;
    }
}

// ---------------------------------------------------------------------------
// saveAnswer
//   Called from event:answer.
//   Upserts an AttemptAnswer row.
// ---------------------------------------------------------------------------
export async function saveAnswer(params: {
    eventCode: string;
    attemptId: string;
    questionIndex: number;
    optionIndex: number;
    isCorrect: boolean;
}): Promise<void> {
    try {
        const session = await prisma.quizSession.findUnique({
            where: { eventCode: params.eventCode },
            select: { quizId: true },
        });
        if (!session?.quizId) return;

        const question = await prisma.question.findUnique({
            where: { quizId_index: { quizId: session.quizId, index: params.questionIndex } },
            select: { id: true },
        });
        if (!question) return;

        const option = await prisma.option.findUnique({
            where: { questionId_index: { questionId: question.id, index: params.optionIndex } },
            select: { id: true },
        });
        if (!option) return;

        await prisma.attemptAnswer.upsert({
            where: { attemptId_questionId: { attemptId: params.attemptId, questionId: question.id } },
            create: {
                attemptId: params.attemptId,
                questionId: question.id,
                selectedOptionId: option.id,
                isCorrect: params.isCorrect,
            },
            update: { selectedOptionId: option.id, isCorrect: params.isCorrect },
        });
    } catch (err) {
        logErr("saveAnswer failed", err);
    }
}
