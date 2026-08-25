import {
    AlertsResponseDTO,
    AnalyticsSessionDTO,
    ComparisonResponseDTO,
    SessionSummaryAnalyticsDTO,
    TopProblemsResponseDTO,
    TrainingTemplateDTO,
    TrendsResponseDTO,
} from "../dtos/AnalyticsDTO";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";

export interface IAnalyticsRepository {
    getTrainingTemplates(scope?: EffectiveScope): Promise<TrainingTemplateDTO[]>;
    getSessions(trainingTemplateId?: string, scope?: EffectiveScope): Promise<AnalyticsSessionDTO[]>;
    getSessionSummary(sessionId: string, scope?: EffectiveScope): Promise<SessionSummaryAnalyticsDTO | null>;
    getSessionAlerts(sessionId: string, scope?: EffectiveScope): Promise<AlertsResponseDTO>;
    getTopProblems(sessionId: string, scope?: EffectiveScope): Promise<TopProblemsResponseDTO>;
    compareByDepartment(sessionId: string, scope?: EffectiveScope): Promise<ComparisonResponseDTO>;
    compareByLocation(sessionId: string, scope?: EffectiveScope): Promise<ComparisonResponseDTO>;
    getTrends(trainingTemplateId: string, scope?: EffectiveScope): Promise<TrendsResponseDTO>;
}
