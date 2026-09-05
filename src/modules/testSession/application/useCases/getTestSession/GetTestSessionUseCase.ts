import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { TestSession } from "../../../domain/TestSession";
import { isTestSessionWithinScope } from "../../../domain/audienceScope";

export class GetTestSessionUseCase {
    constructor(private repo: ITestSessionRepository) { }

    async execute(id: string, scope?: EffectiveScope): Promise<Result<TestSession>> {
        try {
            const session = await this.repo.findById(id);
            // Same failure for "doesn't exist" and "exists but outside your
            // scope" — see PERMISSIONS.md §11.
            if (!session || !isTestSessionWithinScope(session, scope)) {
                return Result.fail(`NOT_FOUND: Test session with id ${id} not found`);
            }
            return Result.ok(session);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
