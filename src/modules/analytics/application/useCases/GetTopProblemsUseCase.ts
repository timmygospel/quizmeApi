import { UseCase } from "../../../../shared/core/UseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { TopProblemsResponseDTO } from "../../dtos/AnalyticsDTO";

export class GetTopProblemsUseCase implements UseCase<string, Promise<TopProblemsResponseDTO>> {
    constructor(private readonly repo: IAnalyticsRepository) {}

    async execute(sessionId: string): Promise<TopProblemsResponseDTO> {
        return this.repo.getTopProblems(sessionId);
    }
}
