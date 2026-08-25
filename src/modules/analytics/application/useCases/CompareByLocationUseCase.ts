import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { ComparisonResponseDTO } from "../../dtos/AnalyticsDTO";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

export class CompareByLocationUseCase implements UseCase<string, Promise<ComparisonResponseDTO>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(sessionId: string, scope?: EffectiveScope): Promise<ComparisonResponseDTO> {
        return this.repo.compareByLocation(sessionId, scope);
    }
}
