import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { SessionSummaryAnalyticsDTO } from "../../dtos/AnalyticsDTO";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

export class GetSessionSummaryUseCase implements UseCase<string, Promise<SessionSummaryAnalyticsDTO | null>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(sessionId: string, scope?: EffectiveScope): Promise<SessionSummaryAnalyticsDTO | null> {
        return this.repo.getSessionSummary(sessionId, scope);
    }
}
