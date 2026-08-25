import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { TrainingTemplateDTO } from "../../dtos/AnalyticsDTO";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

export class GetTrainingTemplatesUseCase implements UseCase<EffectiveScope | undefined, Promise<TrainingTemplateDTO[]>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(scope?: EffectiveScope): Promise<TrainingTemplateDTO[]> {
        return this.repo.getTrainingTemplates(scope);
    }
}
