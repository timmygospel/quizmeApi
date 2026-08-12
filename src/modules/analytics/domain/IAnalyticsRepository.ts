import {
    AlertsResponseDTO,
    AnalyticsSessionDTO,
    ComparisonResponseDTO,
    SessionSummaryAnalyticsDTO,
    TopProblemsResponseDTO,
    TrainingTemplateDTO,
    TrendsResponseDTO,
} from "../dtos/AnalyticsDTO";

export interface IAnalyticsRepository {
    getTrainingTemplates(): Promise<TrainingTemplateDTO[]>;
    getSessions(trainingTemplateId?: string): Promise<AnalyticsSessionDTO[]>;
    getSessionSummary(sessionId: string): Promise<SessionSummaryAnalyticsDTO | null>;
    getSessionAlerts(sessionId: string): Promise<AlertsResponseDTO>;
    getTopProblems(sessionId: string): Promise<TopProblemsResponseDTO>;
    compareByDepartment(sessionId: string): Promise<ComparisonResponseDTO>;
    compareByLocation(sessionId: string): Promise<ComparisonResponseDTO>;
    getTrends(trainingTemplateId: string): Promise<TrendsResponseDTO>;
}
