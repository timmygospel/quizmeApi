// ASSESSMENTS.md §8 lifecycle. Frontend labels ("Draft", "In Review", ...)
// are a presentation concern — the wire/domain value stays the raw code.
export type AssessmentStatus = "DRAFT" | "IN_REVIEW" | "APPROVED" | "PUBLISHED" | "ARCHIVED";

export const ASSESSMENT_STATUSES: AssessmentStatus[] = [
    "DRAFT",
    "IN_REVIEW",
    "APPROVED",
    "PUBLISHED",
    "ARCHIVED",
];

export function isAssessmentStatus(value: string): value is AssessmentStatus {
    return (ASSESSMENT_STATUSES as string[]).includes(value);
}
