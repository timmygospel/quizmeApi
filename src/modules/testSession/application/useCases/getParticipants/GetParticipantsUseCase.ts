import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { ParticipantRowDTO } from "../../../dtos/TestSessionDTO";
import { isTestSessionWithinScope } from "../../../domain/audienceScope";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { finalizeExpiredForSessions } from "../shared/finalizeExpiredForSessions";

export class GetParticipantsUseCase {
    constructor(
        private repo: ITestSessionRepository,
        private attemptRepo: IAttemptRepository,
        private assessmentRepo: IAssessmentRepository
    ) { }

    // Abandoned attempts and no-shows are finalized before anything is reported (no background job).
    private finalizeExpired(testSessionIds: string[]): Promise<void> {
        return finalizeExpiredForSessions(testSessionIds, {
            attemptRepo: this.attemptRepo,
            testSessionRepo: this.repo,
            assessmentRepo: this.assessmentRepo,
        });
    }

    async execute(testSessionId: string, scope?: EffectiveScope): Promise<Result<ParticipantRowDTO[]>> {
        try {
            const session = await this.repo.findById(testSessionId);
            if (!session || !isTestSessionWithinScope(session, scope)) {
                return Result.fail(`NOT_FOUND: Test session with id ${testSessionId} not found`);
            }

            await this.finalizeExpired([testSessionId]);
            const participants = await this.repo.getParticipants(testSessionId);
            return Result.ok(participants);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
