import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { AlertsResponseDTO } from "../../dtos/AnalyticsDTO";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

export class GetSessionAlertsUseCase implements UseCase<string, Promise<AlertsResponseDTO>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(sessionId: string, scope?: EffectiveScope): Promise<AlertsResponseDTO> {
        return this.repo.getSessionAlerts(sessionId, scope);
    }
}
