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
    /** location/department/team id, for drilling down. */
    id: string | null;
    name: string;
    assigned: number;
    completed: number;
    averageScore: number;
    passRate: number;
}

export interface AnalyticsBreakdownDTO {
    overall: ResultsDTO;
    groupBy: string;
    /** Set when the breakdown is limited to one location (drill-down). */
    locationId?: string | null;
    groups: AnalyticsGroupDTO[];
}

export interface ActivityEntryDTO {
    id: string;
    /** TEST_SESSION_CREATED | TEST_SESSION_CLOSED | TEST_SESSION_CANCELLED | ATTEMPT_SUBMITTED | … */
    eventType: string;
    occurredAt: string;
    actorName: string | null;
    attemptNumber: number | null;
}
