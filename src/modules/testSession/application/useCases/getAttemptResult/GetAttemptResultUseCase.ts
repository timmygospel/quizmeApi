import { Result } from "../../../../../shared/core/Result";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { Attempt } from "../../../domain/Attempt";
import { AttemptResponse } from "../../../domain/AttemptResponse";
import { Assessment } from "../../../../assessment/domain/Assessment";
import { AttemptMap } from "../../../mappers/AttemptMap";
import { ParticipantResultDTO, ReviewQuestionDTO } from "../../../dtos/AttemptDTO";

/**
 * What the participant is shown about one of their finished attempts. The assessment's
 * resultVisibility decides: NONE hides score and pass/fail, PASS_FAIL hides the score,
 * SCORE shows both, FULL_REVIEW adds each question with their answer and the correct one.
 * This is the only way a participant gets their result, so the rule is enforced here, not in the UI.
 */
export function toParticipantResult(attempt: Attempt, assessment: Assessment, responses: AttemptResponse[]): ParticipantResultDTO {
    const visibility = assessment.resultVisibility;
    const base = AttemptMap.toDTO(attempt);
    const result: ParticipantResultDTO = {
        ...base,
        resultVisibility: visibility,
        scorePercentage: visibility === "SCORE" || visibility === "FULL_REVIEW" ? base.scorePercentage : null,
        passed: visibility === "NONE" ? null : base.passed,
    };

    if (visibility === "FULL_REVIEW") {
        const byQuestion = new Map(responses.map((r) => [r.assessmentQuestionId, r]));
        result.review = (assessment.questions ?? []).map((q): ReviewQuestionDTO => {
            const response = byQuestion.get(q.id!);
            return {
                id: q.id!,
                question: q.question.value,
                options: q.options.map((o) => ({ id: o.id!, text: o.text.value, correct: o.correct })),
                selectedOptionId: response?.selectedOptionId ?? null,
                isCorrect: response?.isCorrect === true,
            };
        });
    }
    return result;
}

export class GetAttemptResultUseCase {
    constructor(
        private attemptRepo: IAttemptRepository,
        private testSessionRepo: ITestSessionRepository,
        private assessmentRepo: IAssessmentRepository
    ) { }

    async execute(attemptId: string, userId: string): Promise<Result<ParticipantResultDTO>> {
        try {
            const attempt = await this.attemptRepo.findById(attemptId);
            if (!attempt) return Result.fail(`NOT_FOUND: Attempt with id ${attemptId} not found`);

            const participant = await this.testSessionRepo.findParticipantById(attempt.testSessionParticipantId);
            if (!participant || participant.userId !== userId) {
                return Result.fail("FORBIDDEN: This attempt does not belong to you");
            }
            // Never reveal anything (e.g. correct answers) while the attempt can still be changed.
            if (attempt.status === "IN_PROGRESS") return Result.fail("CONFLICT: This attempt has not been submitted yet");

            const session = await this.testSessionRepo.findById(attempt.testSessionId);
            const assessment = session ? await this.assessmentRepo.findById(session.assessmentId) : null;
            if (!assessment) return Result.fail("NOT_FOUND: The assessment for this attempt could not be found");

            const responses = assessment.resultVisibility === "FULL_REVIEW" ? await this.attemptRepo.findResponses(attemptId) : [];
            return Result.ok(toParticipantResult(attempt, assessment, responses));
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
