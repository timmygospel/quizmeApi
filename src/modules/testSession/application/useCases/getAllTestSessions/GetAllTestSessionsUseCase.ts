import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { TestSession } from "../../../domain/TestSession";

export class GetAllTestSessionsUseCase {
    constructor(private repo: ITestSessionRepository) { }

    async execute(scope?: EffectiveScope): Promise<Result<TestSession[]>> {
        try {
            const sessions = await this.repo.findAll(scope);
            return Result.ok(sessions);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
