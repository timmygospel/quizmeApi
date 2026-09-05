import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository, ResultsSummary } from "../../../domain/ITestSessionRepository";
import { isTestSessionWithinScope } from "../../../domain/audienceScope";

export class GetResultsUseCase {
    constructor(private repo: ITestSessionRepository) { }

    async execute(testSessionId: string, scope?: EffectiveScope): Promise<Result<ResultsSummary>> {
        try {
            const session = await this.repo.findById(testSessionId);
            if (!session || !isTestSessionWithinScope(session, scope)) {
                return Result.fail(`NOT_FOUND: Test session with id ${testSessionId} not found`);
            }

            const results = await this.repo.getResults(testSessionId);
            return Result.ok(results);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
