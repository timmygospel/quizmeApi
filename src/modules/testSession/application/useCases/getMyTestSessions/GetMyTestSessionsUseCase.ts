import { Result } from "../../../../../shared/core/Result";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { deriveMyTestSessionStatus } from "../../../domain/myTestSessionStatus";
import { MyTestSessionDTO } from "../../../dtos/MyTestSessionDTO";

export class GetMyTestSessionsUseCase {
    constructor(private repo: ITestSessionRepository) { }

    async execute(userId: string): Promise<Result<MyTestSessionDTO[]>> {
        try {
            const rows = await this.repo.findMyTestSessions(userId);
            const now = new Date();

            const items: MyTestSessionDTO[] = rows.map(({ session, participant }) => ({
                testSessionId: session.id!,
                name: session.name,
                assessmentId: session.assessmentId,
                availableFrom: session.availableFrom.toISOString(),
                availableUntil: session.availableUntil.toISOString(),
                timeLimitMinutes: session.timeLimitMinutes,
                status: deriveMyTestSessionStatus(participant.status, session.availableFrom, session.availableUntil, now),
            }));

            return Result.ok(items);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
