import { Result } from "../../../../../shared/core/Result";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { AttemptResponse } from "../../../domain/AttemptResponse";
import { finalizeExpiredAttempt } from "../shared/finalizeExpiredAttempt";

export class SaveResponseUseCase {
    constructor(
        private attemptRepo: IAttemptRepository,
        private testSessionRepo: ITestSessionRepository,
        private assessmentRepo: IAssessmentRepository
    ) { }

    async execute(
        attemptId: string,
        assessmentQuestionId: string,
        userId: string,
        selectedOptionId: string
    ): Promise<Result<AttemptResponse>> {
        try {
            const attempt = await this.attemptRepo.findById(attemptId);
            if (!attempt) return Result.fail(`NOT_FOUND: Attempt with id ${attemptId} not found`);

            const participant = await this.testSessionRepo.findParticipantById(attempt.testSessionParticipantId);
            if (!participant || participant.userId !== userId) {
                return Result.fail("FORBIDDEN: This attempt does not belong to you");
            }

            const now = new Date();
            if (attempt.status === "IN_PROGRESS" && now >= attempt.expiresAt) {
                await finalizeExpiredAttempt(attempt, {
                    attemptRepo: this.attemptRepo,
                    testSessionRepo: this.testSessionRepo,
                    assessmentRepo: this.assessmentRepo,
                });
                return Result.fail("CONFLICT: This attempt has expired and no longer accepts answers");
            }
            if (attempt.status !== "IN_PROGRESS") {
                return Result.fail(`CONFLICT: This attempt is already ${attempt.status}`);
            }

            if (!selectedOptionId) return Result.fail("selectedOptionId is required");

            const response = await this.attemptRepo.upsertResponse(attemptId, assessmentQuestionId, selectedOptionId);
            if (!response) return Result.fail("The selected option does not belong to this question");

            return Result.ok(response);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
