export interface ResultsDTO {
    assigned: number;
    started: number;
    completed: number;
    passed: number;
    failed: number;
    timedOut: number;
    averageScore: number;
    completionRate: number;
    passRate: number;
}

export interface AnalyticsGroupDTO {
    name: string;
    assigned: number;
    completed: number;
    averageScore: number;
    passRate: number;
}

export interface AnalyticsBreakdownDTO {
    overall: ResultsDTO;
    groupBy: string;
    groups: AnalyticsGroupDTO[];
}
