import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { TrendsResponseDTO } from "../../dtos/AnalyticsDTO";

export class GetTrendsUseCase implements UseCase<string, Promise<TrendsResponseDTO>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(trainingTemplateId: string): Promise<TrendsResponseDTO> {
        return this.repo.getTrends(trainingTemplateId);
    }
}
