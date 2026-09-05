export interface AudienceRuleDTO {
    locationId: string;
    departmentId: string;
    teamId?: string | null;
}

export interface CreateTestSessionDTO {
    assessmentId: string;
    name: string;
    availableFrom: string;
    availableUntil: string;
    timeLimitMinutes: number;
    maxAttempts?: number;
    audience: AudienceRuleDTO[];
}
