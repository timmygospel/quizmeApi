export interface SessionDTO {
    id: string;
    templateId: string;
    name: string;
    departmentIds: string[];
    locationIds: string[];
    allLocations: boolean;
    sectionIds: string[];
    host: string;
    sessionType: "assessment" | "live-quiz";
    passThreshold: number;
    allowMultipleAttempts: boolean;
    additionalNotes: string;
    createdAt?: string;
    updatedAt?: string;
}
