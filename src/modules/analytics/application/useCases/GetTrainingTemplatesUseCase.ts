import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { TrainingTemplateDTO } from "../../dtos/AnalyticsDTO";

export class GetTrainingTemplatesUseCase implements UseCase<void, Promise<TrainingTemplateDTO[]>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(): Promise<TrainingTemplateDTO[]> {
        return this.repo.getTrainingTemplates();
    }
}
