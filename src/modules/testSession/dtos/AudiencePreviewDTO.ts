export interface AudiencePreviewGroupDTO {
    locationId: string;
    location: string;
    departmentId: string;
    department: string;
    count: number;
}

export interface AudiencePreviewResultDTO {
    total: number;
    groups: AudiencePreviewGroupDTO[];
}
