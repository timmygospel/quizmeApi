import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { isTestSessionWithinScope } from "../../../domain/audienceScope";
import { ActivityEntryDTO } from "../../../dtos/ResultsDTO";

// The session's Activity tab: who created/closed/cancelled it and when attempts were submitted.
// Scores are deliberately not included — results live on the Results tab.
export class GetActivityUseCase {
    constructor(private repo: ITestSessionRepository) { }

    async execute(testSessionId: string, scope?: EffectiveScope): Promise<Result<ActivityEntryDTO[]>> {
        try {
            const session = await this.repo.findById(testSessionId);
            if (!session || !isTestSessionWithinScope(session, scope)) {
                return Result.fail(`NOT_FOUND: Test session with id ${testSessionId} not found`);
            }
            const entries = await this.repo.getActivity(testSessionId);
            return Result.ok(entries.map((e) => ({
                id: e.id,
                eventType: e.eventType,
                occurredAt: e.occurredAt.toISOString(),
                actorName: e.actorName,
                attemptNumber: e.attemptNumber,
            })));
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
