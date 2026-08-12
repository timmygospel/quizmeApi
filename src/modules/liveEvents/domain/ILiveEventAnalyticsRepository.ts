import { ParticipantRowDTO, QuestionAnalysisDTO, SessionSummaryDTO } from "../dtos/DashboardDTO";

export interface ILiveEventAnalyticsRepository {
    getSummary(eventCode: string): Promise<SessionSummaryDTO | null>;
    getParticipants(eventCode: string): Promise<ParticipantRowDTO[]>;
    getQuestionAnalysis(eventCode: string): Promise<QuestionAnalysisDTO[]>;
}
