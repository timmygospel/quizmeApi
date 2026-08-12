import { UseCase } from "../../../../../shared/core/UseCase";
import { ILiveEventAnalyticsRepository } from "../../../domain/ILiveEventAnalyticsRepository";
import { SessionSummaryDTO } from "../../../dtos/DashboardDTO";

export class GetLiveEventSummaryUseCase implements UseCase<string, Promise<SessionSummaryDTO | null>> {
    constructor(private readonly repo: ILiveEventAnalyticsRepository) {}

    async execute(eventCode: string): Promise<SessionSummaryDTO | null> {
        return this.repo.getSummary(eventCode);
    }
}
