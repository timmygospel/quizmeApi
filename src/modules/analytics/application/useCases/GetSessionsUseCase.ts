import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { AnalyticsSessionDTO } from "../../dtos/AnalyticsDTO";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

export class GetSessionsUseCase implements UseCase<string | undefined, Promise<AnalyticsSessionDTO[]>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(trainingTemplateId?: string, scope?: EffectiveScope): Promise<AnalyticsSessionDTO[]> {
        return this.repo.getSessions(trainingTemplateId, scope);
    }
}
