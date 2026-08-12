import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { AnalyticsSessionDTO } from "../../dtos/AnalyticsDTO";

export class GetSessionsUseCase implements UseCase<string | undefined, Promise<AnalyticsSessionDTO[]>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(trainingTemplateId?: string): Promise<AnalyticsSessionDTO[]> {
        return this.repo.getSessions(trainingTemplateId);
    }
}
