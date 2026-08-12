import { pgPool } from "../../../../shared/infra/postgres/pgClient";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import {
    AlertsResponseDTO,
    AnalyticsSessionDTO,
    ComparisonResponseDTO,
    DashboardAlertDTO,
    SessionSummaryAnalyticsDTO,
    TopProblemsResponseDTO,
    TrainingTemplateDTO,
    TrendsResponseDTO,
} from "../../dtos/AnalyticsDTO";

// Below this many responses, a question/section rate is too noisy to alert on.
const MIN_SAMPLE_SIZE = 5;
const LOW_PASS_RATE_THRESHOLD = 70;
const WEAK_SECTION_THRESHOLD = 60;
const VERY_DIFFICULT_QUESTION_THRESHOLD = 40;

export class PgAnalyticsRepository implements IAnalyticsRepository {
    async getTrainingTemplates(): Promise<TrainingTemplateDTO[]> {
        const { rows } = await pgPool.query<{ id: string; title: string }>(
            "SELECT id, title FROM quizzes ORDER BY created_at DESC"
        );
        return rows.map((r) => ({ id: r.id, name: r.title }));
    }

    async getSessions(trainingTemplateId?: string): Promise<AnalyticsSessionDTO[]> {
        const { rows } = await pgPool.query<{ id: string; name: string; created_at: Date }>(
            trainingTemplateId
                ? "SELECT id, name, created_at FROM sessions WHERE template_id = $1 ORDER BY created_at DESC"
                : "SELECT id, name, created_at FROM sessions ORDER BY created_at DESC",
            trainingTemplateId ? [trainingTemplateId] : []
        );
        return rows.map((r) => ({ id: r.id, name: r.name, startedAt: r.created_at.toISOString() }));
    }

    async getSessionSummary(sessionId: string): Promise<SessionSummaryAnalyticsDTO | null> {
        const { rows: sessionRows } = await pgPool.query<{ pass_threshold: number }>(
            "SELECT pass_threshold FROM sessions WHERE id = $1",
            [sessionId]
        );
        const session = sessionRows[0];
        if (!session) return null;

        const { rows } = await pgPool.query<{
            participants_completed: string;
            failed_count: string;
            passed_count: string;
            average_score: string | null;
            average_completion_time_seconds: string | null;
        }>(
            `SELECT
                COUNT(*) FILTER (WHERE completed_at IS NOT NULL) AS participants_completed,
                COUNT(*) FILTER (WHERE completed_at IS NOT NULL AND passed = false) AS failed_count,
                COUNT(*) FILTER (WHERE completed_at IS NOT NULL AND passed = true) AS passed_count,
                AVG(score_percentage) FILTER (WHERE completed_at IS NOT NULL) AS average_score,
                AVG(EXTRACT(EPOCH FROM (completed_at - started_at))) FILTER (WHERE completed_at IS NOT NULL) AS average_completion_time_seconds
             FROM session_attempt
             WHERE session_id = $1`,
            [sessionId]
        );

        const row = rows[0];
        const participantsCompleted = Number(row?.participants_completed ?? 0);
        const passedCount = Number(row?.passed_count ?? 0);

        return {
            average_score: Number(row?.average_score ?? 0),
            participants_completed: participantsCompleted,
            failed_count: Number(row?.failed_count ?? 0),
            pass_rate: participantsCompleted > 0 ? (passedCount / participantsCompleted) * 100 : 0,
            average_completion_time_seconds: Number(row?.average_completion_time_seconds ?? 0),
            pass_threshold: session.pass_threshold,
        };
    }

    async getSessionAlerts(sessionId: string): Promise<AlertsResponseDTO> {
        const alerts: DashboardAlertDTO[] = [];

        const summary = await this.getSessionSummary(sessionId);
        if (summary && summary.participants_completed > 0 && summary.pass_rate < LOW_PASS_RATE_THRESHOLD) {
            alerts.push({
                title: "Low pass rate",
                message: `Pass rate is ${Math.round(summary.pass_rate)}%, below the ${LOW_PASS_RATE_THRESHOLD}% target.`,
                severity: "high",
                metric: summary.pass_rate,
                threshold: LOW_PASS_RATE_THRESHOLD,
                related_entity_type: "session",
                related_entity_id: sessionId,
            });
        }

        const weakSections = await this.querySectionScores(sessionId);
        for (const section of weakSections) {
            if (section.responseCount >= MIN_SAMPLE_SIZE && section.averageScore < WEAK_SECTION_THRESHOLD) {
                alerts.push({
                    title: "Weak section",
                    message: `"${section.name}" understanding is ${Math.round(section.averageScore)}%, below the ${WEAK_SECTION_THRESHOLD}% target.`,
                    severity: "medium",
                    metric: section.averageScore,
                    threshold: WEAK_SECTION_THRESHOLD,
                    related_entity_type: "section",
                    related_entity_id: section.id,
                });
            }
        }

        const questionScores = await this.queryQuestionScores(sessionId);
        for (const question of questionScores) {
            if (question.responseCount >= MIN_SAMPLE_SIZE && question.successRate < VERY_DIFFICULT_QUESTION_THRESHOLD) {
                alerts.push({
                    title: "Very difficult question",
                    message: `A question is scoring ${Math.round(question.successRate)}% correct, below the ${VERY_DIFFICULT_QUESTION_THRESHOLD}% target.`,
                    severity: "high",
                    metric: question.successRate,
                    threshold: VERY_DIFFICULT_QUESTION_THRESHOLD,
                    related_entity_type: "question",
                    related_entity_id: question.id,
                });
            }
        }

        return { alerts };
    }

    async getTopProblems(sessionId: string): Promise<TopProblemsResponseDTO> {
        const { rows: atRiskRows } = await pgPool.query<{
            participant_id: string;
            display_name: string | null;
            score_percentage: string;
        }>(
            `SELECT sp.id AS participant_id, sp.display_name, sa.score_percentage
             FROM session_attempt sa
             JOIN session_participant sp ON sp.id = sa.session_participant_id
             WHERE sa.session_id = $1 AND sa.completed_at IS NOT NULL
             ORDER BY sa.score_percentage ASC
             LIMIT 10`,
            [sessionId]
        );

        const weakSections = (await this.querySectionScores(sessionId))
            .filter((s) => s.responseCount > 0)
            .sort((a, b) => a.averageScore - b.averageScore)
            .slice(0, 10);

        const hardestQuestions = (await this.queryQuestionScores(sessionId))
            .filter((q) => q.responseCount > 0)
            .sort((a, b) => a.successRate - b.successRate)
            .slice(0, 10);

        return {
            at_risk_users: atRiskRows.map((r) => ({
                participantId: r.participant_id,
                name: r.display_name?.trim() || "Anonymous participant",
                score: Number(r.score_percentage),
            })),
            weak_sections: weakSections.map((s) => ({ sectionId: s.id, name: s.name, average_score: s.averageScore })),
            hardest_questions: hardestQuestions.map((q) => ({
                questionId: q.id,
                text: q.text,
                correct_rate: q.successRate,
            })),
        };
    }

    async compareByDepartment(sessionId: string): Promise<ComparisonResponseDTO> {
        return this.compareByGroup(sessionId, "department_id", "departments");
    }

    async compareByLocation(sessionId: string): Promise<ComparisonResponseDTO> {
        return this.compareByGroup(sessionId, "location_id", "locations");
    }

    async getTrends(trainingTemplateId: string): Promise<TrendsResponseDTO> {
        const { rows } = await pgPool.query<{
            period: Date;
            average_score: string;
            passed_count: string;
            total_count: string;
        }>(
            `SELECT
                date_trunc('day', sa.completed_at) AS period,
                AVG(sa.score_percentage) AS average_score,
                COUNT(*) FILTER (WHERE sa.passed = true) AS passed_count,
                COUNT(*) AS total_count
             FROM session_attempt sa
             JOIN sessions s ON s.id = sa.session_id
             WHERE s.template_id = $1 AND sa.completed_at IS NOT NULL
             GROUP BY period
             ORDER BY period`,
            [trainingTemplateId]
        );

        return {
            trends: rows.map((r) => {
                const total = Number(r.total_count);
                const passRate = total > 0 ? (Number(r.passed_count) / total) * 100 : 0;
                return {
                    period: r.period.toISOString().slice(0, 10),
                    average_score: Number(r.average_score ?? 0),
                    pass_rate: passRate,
                    fail_rate: 100 - passRate,
                    // We only ever store completed attempts today (no separate
                    // "assigned but not started" tracking), so every recorded
                    // attempt is, by construction, a completed one.
                    completion_rate: 100,
                    participants_completed: total,
                };
            }),
        };
    }

    private async compareByGroup(
        sessionId: string,
        column: "department_id" | "location_id",
        table: "departments" | "locations"
    ): Promise<ComparisonResponseDTO> {
        const { rows } = await pgPool.query<{ id: string; name: string; average_score: string }>(
            `SELECT g.id, g.name, AVG(sa.score_percentage) AS average_score
             FROM session_attempt sa
             JOIN session_participant sp ON sp.id = sa.session_participant_id
             JOIN ${table} g ON g.id = sp.${column}
             WHERE sa.session_id = $1 AND sa.completed_at IS NOT NULL
             GROUP BY g.id, g.name
             ORDER BY average_score ASC`,
            [sessionId]
        );

        return { items: rows.map((r) => ({ id: r.id, name: r.name, average_score: Number(r.average_score) })) };
    }

    private async querySectionScores(
        sessionId: string
    ): Promise<{ id: string; name: string; averageScore: number; responseCount: number }[]> {
        const { rows } = await pgPool.query<{
            id: string;
            name: string;
            correct_count: string;
            response_count: string;
        }>(
            `SELECT
                qs.id,
                qs.name,
                COUNT(*) FILTER (WHERE sr.is_correct) AS correct_count,
                COUNT(*) AS response_count
             FROM session_response sr
             JOIN session_attempt sa ON sa.id = sr.session_attempt_id
             JOIN quiz_section_questions qsq ON qsq.question_id = sr.quiz_question_id
             JOIN quiz_sections qs ON qs.id = qsq.section_id
             WHERE sa.session_id = $1
             GROUP BY qs.id, qs.name`,
            [sessionId]
        );

        return rows.map((r) => {
            const responseCount = Number(r.response_count);
            const averageScore = responseCount > 0 ? (Number(r.correct_count) / responseCount) * 100 : 0;
            return { id: r.id, name: r.name, averageScore, responseCount };
        });
    }

    private async queryQuestionScores(
        sessionId: string
    ): Promise<{ id: string; text: string; successRate: number; responseCount: number }[]> {
        const { rows } = await pgPool.query<{
            id: string;
            question_text: string;
            correct_count: string;
            response_count: string;
        }>(
            `SELECT
                qq.id,
                qq.question_text,
                COUNT(*) FILTER (WHERE sr.is_correct) AS correct_count,
                COUNT(*) AS response_count
             FROM session_response sr
             JOIN session_attempt sa ON sa.id = sr.session_attempt_id
             JOIN quiz_questions qq ON qq.id = sr.quiz_question_id
             WHERE sa.session_id = $1
             GROUP BY qq.id, qq.question_text`,
            [sessionId]
        );

        return rows.map((r) => {
            const responseCount = Number(r.response_count);
            const successRate = responseCount > 0 ? (Number(r.correct_count) / responseCount) * 100 : 0;
            return { id: r.id, text: r.question_text, successRate, responseCount };
        });
    }
}
