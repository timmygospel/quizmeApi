import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { ParticipantRowDTO } from "../../../dtos/TestSessionDTO";
import { isTestSessionWithinScope } from "../../../domain/audienceScope";

export class GetParticipantsUseCase {
    constructor(private repo: ITestSessionRepository) { }

    async execute(testSessionId: string, scope?: EffectiveScope): Promise<Result<ParticipantRowDTO[]>> {
        try {
            const session = await this.repo.findById(testSessionId);
            if (!session || !isTestSessionWithinScope(session, scope)) {
                return Result.fail(`NOT_FOUND: Test session with id ${testSessionId} not found`);
            }

            const participants = await this.repo.getParticipants(testSessionId);
            return Result.ok(participants);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
