import { Result } from "../../../../../shared/core/Result";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { finalizeExpiredAttempt } from "../shared/finalizeExpiredAttempt";

// The participant's "mark for review" flag on a question. Kept on the server (not just in the
// browser) so it survives a resume. Same ownership/timer rules as saving an answer.
export class MarkForReviewUseCase {
    constructor(
        private attemptRepo: IAttemptRepository,
        private testSessionRepo: ITestSessionRepository,
        private assessmentRepo: IAssessmentRepository
    ) { }

    async execute(attemptId: string, assessmentQuestionId: string, userId: string, marked: boolean): Promise<Result<void>> {
        try {
            const attempt = await this.attemptRepo.findById(attemptId);
            if (!attempt) return Result.fail(`NOT_FOUND: Attempt with id ${attemptId} not found`);

            const participant = await this.testSessionRepo.findParticipantById(attempt.testSessionParticipantId);
            if (!participant || participant.userId !== userId) {
                return Result.fail("FORBIDDEN: This attempt does not belong to you");
            }

            if (attempt.status === "IN_PROGRESS" && new Date() >= attempt.expiresAt) {
                await finalizeExpiredAttempt(attempt, {
                    attemptRepo: this.attemptRepo,
                    testSessionRepo: this.testSessionRepo,
                    assessmentRepo: this.assessmentRepo,
                });
                return Result.fail("CONFLICT: This attempt has expired");
            }
            if (attempt.status !== "IN_PROGRESS") {
                return Result.fail(`CONFLICT: This attempt is already ${attempt.status}`);
            }

            const ok = await this.attemptRepo.setMarkedForReview(attemptId, assessmentQuestionId, marked);
            if (!ok) return Result.fail("NOT_FOUND: That question isn't part of this test");

            return Result.ok<void>();
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
