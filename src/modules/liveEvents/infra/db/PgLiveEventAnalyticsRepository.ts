import { pgPool } from "../../../../shared/infra/postgres/pgClient";
import { ILiveEventAnalyticsRepository } from "../../domain/ILiveEventAnalyticsRepository";
import { ParticipantRowDTO, QuestionAnalysisDTO, SessionSummaryDTO } from "../../dtos/DashboardDTO";

interface EventRow {
    id: string;
    event_code: string;
    name: string;
    status: "live" | "ended";
    started_at: Date;
    ended_at: Date | null;
    passing_score: number;
}

interface ParticipantScoreRow {
    participant_id: string;
    name: string | null;
    joined_at: Date;
    answered_count: string;
    correct_count: string;
}

interface QuestionRow {
    question_index: number;
    question_text: string;
    total_answers: string;
    correct_answers: string;
}

export function difficultyFor(correctRate: number): "Easy" | "Medium" | "Hard" {
    if (correctRate >= 70) return "Easy";
    if (correctRate >= 40) return "Medium";
    return "Hard";
}

export class PgLiveEventAnalyticsRepository implements ILiveEventAnalyticsRepository {
    async getSummary(eventCode: string): Promise<SessionSummaryDTO | null> {
        const { rows: eventRows } = await pgPool.query<EventRow>(
            "SELECT id, event_code, name, status, started_at, ended_at, passing_score FROM live_events WHERE event_code = $1",
            [eventCode]
        );
        const event = eventRows[0];
        if (!event) return null;

        const { rows: countRows } = await pgPool.query<{ total_participants: string; total_questions: string }>(
            `SELECT
                (SELECT COUNT(*) FROM live_participants WHERE live_event_id = $1) AS total_participants,
                (SELECT COUNT(*) FROM live_event_questions WHERE live_event_id = $1) AS total_questions`,
            [event.id]
        );
        const totalParticipants = Number(countRows[0]?.total_participants ?? 0);
        const totalQuestions = Number(countRows[0]?.total_questions ?? 0);

        // Completion/score metrics only mean something once the event has
        // ended (host-paced — no per-participant self-completion). While
        // live, report zero/null rather than a misleading partial number.
        if (event.status !== "ended") {
            return {
                sessionId: event.id,
                eventCode: event.event_code,
                title: event.name,
                status: event.status,
                startedAt: event.started_at.toISOString(),
                endedAt: null,
                totalParticipants,
                completedParticipants: 0,
                completionRate: 0,
                averageScore: null,
                passRate: null,
                passingScore: event.passing_score,
            };
        }

        const scores = await this.getParticipantScores(event.id, totalQuestions, event.passing_score);
        const completedParticipants = scores.length;
        const completionRate = totalParticipants > 0 ? (completedParticipants / totalParticipants) * 100 : 0;
        const averageScore =
            completedParticipants > 0
                ? scores.reduce((sum, s) => sum + s.scorePercentage, 0) / completedParticipants
                : null;
        const passedCount = scores.filter((s) => s.passed).length;
        const passRate = completedParticipants > 0 ? (passedCount / completedParticipants) * 100 : null;

        return {
            sessionId: event.id,
            eventCode: event.event_code,
            title: event.name,
            status: event.status,
            startedAt: event.started_at.toISOString(),
            endedAt: event.ended_at?.toISOString() ?? null,
            totalParticipants,
            completedParticipants,
            completionRate,
            averageScore,
            passRate,
            passingScore: event.passing_score,
        };
    }

    async getParticipants(eventCode: string): Promise<ParticipantRowDTO[]> {
        const { rows: eventRows } = await pgPool.query<EventRow>(
            "SELECT id, status, started_at, ended_at, passing_score FROM live_events WHERE event_code = $1",
            [eventCode]
        );
        const event = eventRows[0];
        if (!event) return [];

        const { rows: countRows } = await pgPool.query<{ total_questions: string }>(
            "SELECT COUNT(*) AS total_questions FROM live_event_questions WHERE live_event_id = $1",
            [event.id]
        );
        const totalQuestions = Number(countRows[0]?.total_questions ?? 0);

        const { rows } = await pgPool.query<ParticipantScoreRow>(
            `SELECT
                lp.participant_id,
                lp.name,
                lp.joined_at,
                COUNT(lr.id) AS answered_count,
                COUNT(lr.id) FILTER (WHERE lr.is_correct) AS correct_count
             FROM live_participants lp
             LEFT JOIN live_responses lr
                ON lr.live_event_id = lp.live_event_id AND lr.participant_id = lp.participant_id
             WHERE lp.live_event_id = $1
             GROUP BY lp.participant_id, lp.name, lp.joined_at
             ORDER BY lp.joined_at`,
            [event.id]
        );

        const isCompleted = event.status === "ended";

        return rows.map((row): ParticipantRowDTO => {
            const correctCount = Number(row.correct_count);
            const totalScore = isCompleted
                ? totalQuestions > 0
                    ? (correctCount / totalQuestions) * 100
                    : 0
                : null;

            return {
                attemptId: row.participant_id,
                displayName: row.name?.trim() || "Anonymous player",
                totalScore,
                passed: isCompleted && totalScore !== null ? totalScore >= event.passing_score : null,
                status: isCompleted ? "completed" : "in_progress",
                answeredQuestions: Number(row.answered_count),
                startedAt: row.joined_at.toISOString(),
                completedAt: isCompleted ? event.ended_at?.toISOString() ?? null : null,
            };
        });
    }

    async getQuestionAnalysis(eventCode: string): Promise<QuestionAnalysisDTO[]> {
        const { rows: eventRows } = await pgPool.query<{ id: string }>(
            "SELECT id FROM live_events WHERE event_code = $1",
            [eventCode]
        );
        const event = eventRows[0];
        if (!event) return [];

        const { rows } = await pgPool.query<QuestionRow>(
            `SELECT
                leq.question_index,
                leq.question_text,
                COUNT(lr.id) AS total_answers,
                COUNT(lr.id) FILTER (WHERE lr.is_correct) AS correct_answers
             FROM live_event_questions leq
             LEFT JOIN live_responses lr
                ON lr.live_event_id = leq.live_event_id AND lr.question_index = leq.question_index
             WHERE leq.live_event_id = $1
             GROUP BY leq.question_index, leq.question_text
             ORDER BY leq.question_index`,
            [event.id]
        );

        return rows.map((row): QuestionAnalysisDTO => {
            const totalAnswers = Number(row.total_answers);
            const correctAnswers = Number(row.correct_answers);
            const correctRate = totalAnswers > 0 ? (correctAnswers / totalAnswers) * 100 : 0;

            return {
                questionId: `${event.id}:${row.question_index}`,
                text: row.question_text,
                correctRate,
                difficulty: difficultyFor(correctRate),
                totalAnswers,
            };
        });
    }

    private async getParticipantScores(
        liveEventId: string,
        totalQuestions: number,
        passingScore: number
    ): Promise<{ scorePercentage: number; passed: boolean }[]> {
        const { rows } = await pgPool.query<{ correct_count: string }>(
            `SELECT lp.participant_id,
                    COUNT(lr.id) FILTER (WHERE lr.is_correct) AS correct_count
             FROM live_participants lp
             LEFT JOIN live_responses lr
                ON lr.live_event_id = lp.live_event_id AND lr.participant_id = lp.participant_id
             WHERE lp.live_event_id = $1
             GROUP BY lp.participant_id`,
            [liveEventId]
        );

        return rows.map((row) => {
            const correctCount = Number(row.correct_count);
            const scorePercentage = totalQuestions > 0 ? (correctCount / totalQuestions) * 100 : 0;
            return { scorePercentage, passed: scorePercentage >= passingScore };
        });
    }
}
