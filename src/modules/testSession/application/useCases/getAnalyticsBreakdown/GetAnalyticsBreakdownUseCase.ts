import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository, AnalyticsGroupBy } from "../../../domain/ITestSessionRepository";
import { isTestSessionWithinScope } from "../../../domain/audienceScope";
import { AnalyticsBreakdownDTO } from "../../../dtos/ResultsDTO";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { finalizeExpiredForSessions } from "../shared/finalizeExpiredForSessions";

export class GetAnalyticsBreakdownUseCase {
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

    async execute(testSessionId: string, groupBy: AnalyticsGroupBy, scope?: EffectiveScope): Promise<Result<AnalyticsBreakdownDTO>> {
        try {
            const session = await this.repo.findById(testSessionId);
            if (!session || !isTestSessionWithinScope(session, scope)) {
                return Result.fail(`NOT_FOUND: Test session with id ${testSessionId} not found`);
            }

            await this.finalizeExpired([testSessionId]);
            const [overall, groups] = await Promise.all([
                this.repo.getResults(testSessionId),
                this.repo.getAnalyticsBreakdown(testSessionId, groupBy),
            ]);

            return Result.ok({ overall, groupBy, groups });
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
