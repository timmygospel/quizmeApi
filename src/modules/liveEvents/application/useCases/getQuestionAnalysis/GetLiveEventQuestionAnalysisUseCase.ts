import { UseCase } from "../../../../../shared/core/UseCase";
import { ILiveEventAnalyticsRepository } from "../../../domain/ILiveEventAnalyticsRepository";
import { QuestionAnalysisTableDTO } from "../../../dtos/DashboardDTO";

export class GetLiveEventQuestionAnalysisUseCase implements UseCase<string, Promise<QuestionAnalysisTableDTO>> {
    constructor(private readonly repo: ILiveEventAnalyticsRepository) {}

    async execute(eventCode: string): Promise<QuestionAnalysisTableDTO> {
        const questions = await this.repo.getQuestionAnalysis(eventCode);
        return { questions };
    }
}
