import { Result } from "../../../../../shared/core/Result";
import { ISessionRepository } from "../../../domain/ISessionRepository";
import { Session } from "../../../domain/Session";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

export class GetAllSessionsUseCase {
    constructor(private repo: ISessionRepository) { }

    async execute(scope?: EffectiveScope): Promise<Result<Session[]>> {
        try {
            const sessions = await this.repo.findAll(scope);
            return Result.ok(sessions);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
