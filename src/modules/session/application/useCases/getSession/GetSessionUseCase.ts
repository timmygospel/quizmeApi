import { Result } from "../../../../../shared/core/Result";
import { ISessionRepository } from "../../../domain/ISessionRepository";
import { Session } from "../../../domain/Session";
import { isSessionWithinScope } from "../../../domain/sessionInScope";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

export class GetSessionUseCase {
    constructor(private repo: ISessionRepository) { }

    async execute(id: string, scope?: EffectiveScope): Promise<Result<Session>> {
        try {
            const session = await this.repo.findById(id);
            // Same failure for "doesn't exist" and "exists but outside your
            // scope" — see PERMISSIONS.md §11.
            if (!session || !isSessionWithinScope(session, scope)) {
                return Result.fail(`Session with id ${id} not found`);
            }
            return Result.ok(session);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
