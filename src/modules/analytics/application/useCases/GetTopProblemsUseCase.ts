import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { TopProblemsResponseDTO } from "../../dtos/AnalyticsDTO";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

export class GetTopProblemsUseCase implements UseCase<string, Promise<TopProblemsResponseDTO>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(sessionId: string, scope?: EffectiveScope): Promise<TopProblemsResponseDTO> {
        return this.repo.getTopProblems(sessionId, scope);
    }
}
