import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository, QuestionAnalysis } from "../../../domain/ITestSessionRepository";
import { isTestSessionWithinScope } from "../../../domain/audienceScope";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { finalizeExpiredForSessions } from "../shared/finalizeExpiredForSessions";

/** Which questions people got wrong most: per-question % correct and how often each option was picked. */
export class GetQuestionAnalysisUseCase {
    constructor(
        private repo: ITestSessionRepository,
        private attemptRepo: IAttemptRepository,
        private assessmentRepo: IAssessmentRepository
    ) { }

    async execute(testSessionId: string, scope?: EffectiveScope): Promise<Result<QuestionAnalysis>> {
        try {
            const session = await this.repo.findById(testSessionId);
            if (!session || !isTestSessionWithinScope(session, scope)) {
                return Result.fail(`NOT_FOUND: Test session with id ${testSessionId} not found`);
            }
            // Same as Results: abandoned attempts are finalized first, so both screens count the same people.
            await finalizeExpiredForSessions([testSessionId], {
                attemptRepo: this.attemptRepo,
                testSessionRepo: this.repo,
                assessmentRepo: this.assessmentRepo,
            });
            return Result.ok(await this.repo.getQuestionAnalysis(testSessionId, session.assessmentId));
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
