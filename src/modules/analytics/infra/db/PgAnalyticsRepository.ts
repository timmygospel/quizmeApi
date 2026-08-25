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
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";
import { buildSessionScopeConditions } from "../../../session/infra/db/PgSessionRepository";

// Below this many responses, a question/section rate is too noisy to alert on.
const MIN_SAMPLE_SIZE = 5;
const LOW_PASS_RATE_THRESHOLD = 70;
const WEAK_SECTION_THRESHOLD = 60;
const VERY_DIFFICULT_QUESTION_THRESHOLD = 40;

export class PgAnalyticsRepository implements IAnalyticsRepository {
    async getTrainingTemplates(scope?: EffectiveScope): Promise<TrainingTemplateDTO[]> {
        const params: unknown[] = [];
        const sessionConditions = buildSessionScopeConditions(scope, params, "s.");
        // A template is visible if at least one of its sessions falls in the
        // caller's scope — templates themselves have no location/department
        // dimension (see quizzes schema), so this is the only way to scope
        // them at all. Unscoped (ORGANISATION/no scope) callers skip the
        // EXISTS check entirely and see every template.
        const whereClause = sessionConditions.length
            ? `WHERE EXISTS (SELECT 1 FROM sessions s WHERE s.template_id = q.id AND ${sessionConditions.join(" AND ")})`
            : "";
        const { rows } = await pgPool.query<{ id: string; title: string }>(
            `SELECT q.id, q.title FROM quizzes q ${whereClause} ORDER BY q.created_at DESC`,
            params
        );
        return rows.map((r) => ({ id: r.id, name: r.title }));
    }

    async getSessions(trainingTemplateId?: string, scope?: EffectiveScope): Promise<AnalyticsSessionDTO[]> {
        const params: unknown[] = [];
        const conditions: string[] = [];
        if (trainingTemplateId) {
            params.push(trainingTemplateId);
            conditions.push(`template_id = $${params.length}`);
        }
        conditions.push(...buildSessionScopeConditions(scope, params));
        const whereClause = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";

        const { rows } = await pgPool.query<{ id: string; name: string; created_at: Date }>(
            `SELECT id, name, created_at FROM sessions ${whereClause} ORDER BY created_at DESC`,
            params
        );
        return rows.map((r) => ({ id: r.id, name: r.name, startedAt: r.created_at.toISOString() }));
    }

    async getSessionSummary(sessionId: string, scope?: EffectiveScope): Promise<SessionSummaryAnalyticsDTO | null> {
        const params: unknown[] = [sessionId];
        // "id = $1" first so buildSessionScopeConditions' placeholders start
        // numbering from $2.
        const conditions = ["id = $1", ...buildSessionScopeConditions(scope, params)];
        const { rows: sessionRows } = await pgPool.query<{ pass_threshold: number }>(
            `SELECT pass_threshold FROM sessions WHERE ${conditions.join(" AND ")}`,
            params
        );
        const session = sessionRows[0];
        // Same failure for "doesn't exist" and "exists but outside your
        // scope" — see PERMISSIONS.md §11.
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

    async getSessionAlerts(sessionId: string, scope?: EffectiveScope): Promise<AlertsResponseDTO> {
        const alerts: DashboardAlertDTO[] = [];

        const summary = await this.getSessionSummary(sessionId, scope);
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

        // querySectionScores/queryQuestionScores are independently scoped
        // (not just gated by the summary null-check above) so an
        // out-of-scope session always yields empty data here, never a leak.
        const weakSections = await this.querySectionScores(sessionId, scope);
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

        const questionScores = await this.queryQuestionScores(sessionId, scope);
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

    async getTopProblems(sessionId: string, scope?: EffectiveScope): Promise<TopProblemsResponseDTO> {
        const atRiskParams: unknown[] = [sessionId];
        const sessionScopeConditions = buildSessionScopeConditions(scope, atRiskParams, "s.");
        const atRiskConditions = ["sa.session_id = $1", "sa.completed_at IS NOT NULL", ...sessionScopeConditions];
        const needsSessionJoin = sessionScopeConditions.length > 0;
        const { rows: atRiskRows } = await pgPool.query<{
            participant_id: string;
            display_name: string | null;
            score_percentage: string;
        }>(
            `SELECT sp.id AS participant_id, sp.display_name, sa.score_percentage
             FROM session_attempt sa
             JOIN session_participant sp ON sp.id = sa.session_participant_id
             ${needsSessionJoin ? "JOIN sessions s ON s.id = sa.session_id" : ""}
             WHERE ${atRiskConditions.join(" AND ")}
             ORDER BY sa.score_percentage ASC
             LIMIT 10`,
            atRiskParams
        );

        const weakSections = (await this.querySectionScores(sessionId, scope))
            .filter((s) => s.responseCount > 0)
            .sort((a, b) => a.averageScore - b.averageScore)
            .slice(0, 10);

        const hardestQuestions = (await this.queryQuestionScores(sessionId, scope))
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

    async compareByDepartment(sessionId: string, scope?: EffectiveScope): Promise<ComparisonResponseDTO> {
        return this.compareByGroup(sessionId, "department_id", "departments", scope);
    }

    async compareByLocation(sessionId: string, scope?: EffectiveScope): Promise<ComparisonResponseDTO> {
        return this.compareByGroup(sessionId, "location_id", "locations", scope);
    }

    async getTrends(trainingTemplateId: string, scope?: EffectiveScope): Promise<TrendsResponseDTO> {
        const params: unknown[] = [trainingTemplateId];
        const conditions = [
            "s.template_id = $1",
            "sa.completed_at IS NOT NULL",
            ...buildSessionScopeConditions(scope, params, "s."),
        ];
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
             WHERE ${conditions.join(" AND ")}
             GROUP BY period
             ORDER BY period`,
            params
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
        table: "departments" | "locations",
        scope?: EffectiveScope
    ): Promise<ComparisonResponseDTO> {
        const params: unknown[] = [sessionId];
        const sessionScopeConditions = buildSessionScopeConditions(scope, params, "s.");
        const conditions = ["sa.session_id = $1", "sa.completed_at IS NOT NULL", ...sessionScopeConditions];
        const { rows } = await pgPool.query<{ id: string; name: string; average_score: string }>(
            `SELECT g.id, g.name, AVG(sa.score_percentage) AS average_score
             FROM session_attempt sa
             JOIN session_participant sp ON sp.id = sa.session_participant_id
             JOIN ${table} g ON g.id = sp.${column}
             ${sessionScopeConditions.length ? "JOIN sessions s ON s.id = sa.session_id" : ""}
             WHERE ${conditions.join(" AND ")}
             GROUP BY g.id, g.name
             ORDER BY average_score ASC`,
            params
        );

        return { items: rows.map((r) => ({ id: r.id, name: r.name, average_score: Number(r.average_score) })) };
    }

    private async querySectionScores(
        sessionId: string,
        scope?: EffectiveScope
    ): Promise<{ id: string; name: string; averageScore: number; responseCount: number }[]> {
        const params: unknown[] = [sessionId];
        const sessionScopeConditions = buildSessionScopeConditions(scope, params, "s.");
        const conditions = ["sa.session_id = $1", ...sessionScopeConditions];
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
             ${sessionScopeConditions.length ? "JOIN sessions s ON s.id = sa.session_id" : ""}
             WHERE ${conditions.join(" AND ")}
             GROUP BY qs.id, qs.name`,
            params
        );

        return rows.map((r) => {
            const responseCount = Number(r.response_count);
            const averageScore = responseCount > 0 ? (Number(r.correct_count) / responseCount) * 100 : 0;
            return { id: r.id, name: r.name, averageScore, responseCount };
        });
    }

    private async queryQuestionScores(
        sessionId: string,
        scope?: EffectiveScope
    ): Promise<{ id: string; text: string; successRate: number; responseCount: number }[]> {
        const params: unknown[] = [sessionId];
        const sessionScopeConditions = buildSessionScopeConditions(scope, params, "s.");
        const conditions = ["sa.session_id = $1", ...sessionScopeConditions];
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
             ${sessionScopeConditions.length ? "JOIN sessions s ON s.id = sa.session_id" : ""}
             WHERE ${conditions.join(" AND ")}
             GROUP BY qq.id, qq.question_text`,
            params
        );

        return rows.map((r) => {
            const responseCount = Number(r.response_count);
            const successRate = responseCount > 0 ? (Number(r.correct_count) / responseCount) * 100 : 0;
            return { id: r.id, text: r.question_text, successRate, responseCount };
        });
    }
}
