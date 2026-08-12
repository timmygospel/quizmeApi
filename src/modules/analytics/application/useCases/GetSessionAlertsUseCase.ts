import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { AlertsResponseDTO } from "../../dtos/AnalyticsDTO";

export class GetSessionAlertsUseCase implements UseCase<string, Promise<AlertsResponseDTO>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(sessionId: string): Promise<AlertsResponseDTO> {
        return this.repo.getSessionAlerts(sessionId);
    }
}
