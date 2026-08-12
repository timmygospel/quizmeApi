import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { SessionSummaryAnalyticsDTO } from "../../dtos/AnalyticsDTO";

export class GetSessionSummaryUseCase implements UseCase<string, Promise<SessionSummaryAnalyticsDTO | null>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(sessionId: string): Promise<SessionSummaryAnalyticsDTO | null> {
        return this.repo.getSessionSummary(sessionId);
    }
}
