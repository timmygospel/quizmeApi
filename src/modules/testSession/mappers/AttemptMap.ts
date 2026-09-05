import { Attempt, AttemptStatus } from "../domain/Attempt";
import { AttemptResponse } from "../domain/AttemptResponse";
import { AttemptDTO, AttemptResponseAckDTO } from "../dtos/AttemptDTO";

export interface AttemptRow {
    id: string;
    test_session_id: string;
    test_session_participant_id: string;
    attempt_number: number;
    started_at: Date;
    expires_at: Date;
    submitted_at: Date | null;
    status: AttemptStatus;
    score_percentage: string | number | null;
    passed: boolean | null;
}

export interface AttemptResponseRow {
    id: string;
    test_attempt_id: string;
    assessment_question_id: string;
    selected_option_id: string | null;
    is_correct: boolean | null;
    answered_at: Date;
}

export class AttemptMap {
    public static toDomain(row: AttemptRow): Attempt {
        return new Attempt(
            {
                testSessionId: row.test_session_id,
                testSessionParticipantId: row.test_session_participant_id,
                attemptNumber: row.attempt_number,
                startedAt: row.started_at,
                expiresAt: row.expires_at,
                submittedAt: row.submitted_at,
                status: row.status,
                scorePercentage: row.score_percentage != null ? Number(row.score_percentage) : null,
                passed: row.passed,
            },
            row.id
        );
    }

    public static toDTO(attempt: Attempt): AttemptDTO {
        return {
            id: attempt.id!,
            testSessionId: attempt.testSessionId,
            attemptNumber: attempt.attemptNumber,
            startedAt: attempt.startedAt.toISOString(),
            expiresAt: attempt.expiresAt.toISOString(),
            submittedAt: attempt.submittedAt ? attempt.submittedAt.toISOString() : attempt.submittedAt ?? null,
            status: attempt.status,
            scorePercentage: attempt.scorePercentage,
            passed: attempt.passed,
        };
    }

    public static responseToDomain(row: AttemptResponseRow): AttemptResponse {
        return new AttemptResponse(
            {
                testAttemptId: row.test_attempt_id,
                assessmentQuestionId: row.assessment_question_id,
                selectedOptionId: row.selected_option_id,
                isCorrect: row.is_correct,
                answeredAt: row.answered_at,
            },
            row.id
        );
    }

    public static responseToAckDTO(response: AttemptResponse): AttemptResponseAckDTO {
        return {
            id: response.id!,
            testAttemptId: response.testAttemptId,
            assessmentQuestionId: response.assessmentQuestionId,
            selectedOptionId: response.selectedOptionId,
            answeredAt: (response.answeredAt ?? new Date()).toISOString(),
        };
    }
}
