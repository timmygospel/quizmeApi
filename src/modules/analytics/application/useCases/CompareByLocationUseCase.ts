import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { ComparisonResponseDTO } from "../../dtos/AnalyticsDTO";

export class CompareByLocationUseCase implements UseCase<string, Promise<ComparisonResponseDTO>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(sessionId: string): Promise<ComparisonResponseDTO> {
        return this.repo.compareByLocation(sessionId);
    }
}
