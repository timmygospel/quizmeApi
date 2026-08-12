import { Result } from "../../../../../shared/core/Result";
import { ISessionRepository } from "../../../domain/ISessionRepository";
import { Session } from "../../../domain/Session";

export class GetSessionUseCase {
    constructor(private repo: ISessionRepository) { }

    async execute(id: string): Promise<Result<Session>> {
        try {
            const session = await this.repo.findById(id);
            if (!session) {
                return Result.fail(`Session with id ${id} not found`);
            }
            return Result.ok(session);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
