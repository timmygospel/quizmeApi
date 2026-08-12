export interface TrainingTemplateDTO {
    id: string;
    name: string;
}

export interface AnalyticsSessionDTO {
    id: string;
    name: string;
    startedAt: string;
}

export interface SessionSummaryAnalyticsDTO {
    average_score: number;
    participants_completed: number;
    failed_count: number;
    pass_rate: number;
    average_completion_time_seconds: number;
    pass_threshold: number;
}

export interface DashboardAlertDTO {
    title: string;
    message: string;
    severity: "high" | "medium" | "low";
    metric?: number;
    threshold?: number;
    related_entity_type?: string;
    related_entity_id?: string;
}

export interface AlertsResponseDTO {
    alerts: DashboardAlertDTO[];
}

export interface AtRiskUserDTO {
    participantId: string;
    name: string;
    score: number;
}

export interface WeakSectionDTO {
    sectionId: string;
    name: string;
    average_score: number;
}

export interface HardQuestionDTO {
    questionId: string;
    text: string;
    correct_rate: number;
}

export interface TopProblemsResponseDTO {
    at_risk_users: AtRiskUserDTO[];
    weak_sections: WeakSectionDTO[];
    hardest_questions: HardQuestionDTO[];
}

export interface ComparisonItemDTO {
    id: string;
    name: string;
    average_score: number;
}

export interface ComparisonResponseDTO {
    items: ComparisonItemDTO[];
}

export interface TrendPointDTO {
    period: string;
    average_score: number;
    pass_rate: number;
    fail_rate: number;
    completion_rate: number;
    participants_completed: number;
}

export interface TrendsResponseDTO {
    trends: TrendPointDTO[];
}
