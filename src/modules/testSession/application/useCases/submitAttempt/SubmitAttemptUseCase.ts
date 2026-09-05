import { Result } from "../../../../../shared/core/Result";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { Attempt } from "../../../domain/Attempt";
import { scoreAttempt } from "../../../domain/scoreAttempt";
import { finalizeExpiredAttempt } from "../shared/finalizeExpiredAttempt";
import { recordAuditEvent } from "../../../../../shared/infra/audit/recordAuditEvent";

export class SubmitAttemptUseCase {
    constructor(
        private attemptRepo: IAttemptRepository,
        private testSessionRepo: ITestSessionRepository,
        private assessmentRepo: IAssessmentRepository
    ) { }

    async execute(attemptId: string, userId: string): Promise<Result<Attempt>> {
        try {
            const attempt = await this.attemptRepo.findById(attemptId);
            if (!attempt) return Result.fail(`NOT_FOUND: Attempt with id ${attemptId} not found`);

            const participant = await this.testSessionRepo.findParticipantById(attempt.testSessionParticipantId);
            if (!participant || participant.userId !== userId) {
                return Result.fail("FORBIDDEN: This attempt does not belong to you");
            }

            if (attempt.status !== "IN_PROGRESS") {
                return Result.fail(`CONFLICT: This attempt is already ${attempt.status}`);
            }

            const now = new Date();
            const deps = { attemptRepo: this.attemptRepo, testSessionRepo: this.testSessionRepo, assessmentRepo: this.assessmentRepo };

            // Server-authoritative timer — a submit arriving after expiry is
            // handled exactly like the timeout path, never a normal submit.
            if (now >= attempt.expiresAt) {
                const timedOut = await finalizeExpiredAttempt(attempt, deps);
                return Result.ok(timedOut);
            }

            const session = await this.testSessionRepo.findById(attempt.testSessionId);
            if (!session) return Result.fail("NOT_FOUND: Test session not found");
            const assessment = await this.assessmentRepo.findById(session.assessmentId);
            if (!assessment) return Result.fail("NOT_FOUND: Assessment not found");

            const responses = await this.attemptRepo.findResponses(attemptId);
            const { scorePercentage, passed } = scoreAttempt(
                assessment.questions?.length ?? 0,
                responses.map((r) => ({ isCorrect: r.isCorrect === true })),
                assessment.passMark
            );

            const submitted = await this.attemptRepo.markSubmitted(attemptId, scorePercentage, passed, now);
            await this.testSessionRepo.updateParticipantStatus(participant.id!, "COMPLETED", { completedAt: now });

            await recordAuditEvent({
                actorUserId: userId,
                eventType: "ATTEMPT_SUBMITTED",
                entityType: "test_attempt",
                entityId: attemptId,
                metadata: { scorePercentage, passed },
            });

            return Result.ok(submitted);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
