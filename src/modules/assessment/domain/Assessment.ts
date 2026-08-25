import { AssessmentName } from "./valueObjects/AssessmentName";
import { AssessmentStatus } from "./AssessmentStatus";
import { AssessmentQuestion } from "./AssessmentQuestion";

export interface AssessmentProps {
    id?: string;
    name: AssessmentName;
    description: string;
    categoryId: string | null;
    // Denormalized display data hydrated by the repository join — not a
    // domain invariant, same treatment Quiz.sections gives plain data.
    categoryName: string | null;
    questionCount: number;
    // Only populated by the single-assessment detail load (findById) — the
    // list load (findAll) leaves this undefined since it never needs full
    // question bodies, just questionCount. See PgAssessmentRepository.
    questions?: AssessmentQuestion[];
    passMark: number;
    maxAttempts: number | null; // null = unlimited
    durationMinutes: number | null; // null = no time limit
    status: AssessmentStatus;
    createdBy: string | null;
    createdByName: string | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Assessment {
    public readonly id?: string;
    public readonly name: AssessmentName;
    public readonly description: string;
    public readonly categoryId: string | null;
    public readonly categoryName: string | null;
    public readonly questionCount: number;
    public readonly questions?: AssessmentQuestion[];
    public readonly passMark: number;
    public readonly maxAttempts: number | null;
    public readonly durationMinutes: number | null;
    public readonly status: AssessmentStatus;
    public readonly createdBy: string | null;
    public readonly createdByName: string | null;
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(props: AssessmentProps) {
        this.id = props.id;
        this.name = props.name;
        this.description = props.description;
        this.categoryId = props.categoryId;
        this.categoryName = props.categoryName;
        this.questionCount = props.questionCount;
        this.questions = props.questions;
        this.passMark = props.passMark;
        this.maxAttempts = props.maxAttempts;
        this.durationMinutes = props.durationMinutes;
        this.status = props.status;
        this.createdBy = props.createdBy;
        this.createdByName = props.createdByName;
        this.createdAt = props.createdAt || new Date();
        this.updatedAt = props.updatedAt || new Date();
    }

    public archive(): Assessment {
        return new Assessment({ ...this, status: "ARCHIVED", updatedAt: new Date() });
    }
}
