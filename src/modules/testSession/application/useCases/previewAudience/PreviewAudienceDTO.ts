export interface AudienceRuleDTO {
    locationId: string;
    departmentId: string;
    teamId?: string | null;
}

export interface PreviewAudienceDTO {
    audience: AudienceRuleDTO[];
}
