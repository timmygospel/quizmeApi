import { Assessment } from "./Assessment";

export interface AssessmentFilters {
    search?: string;
    status?: string;
    categoryId?: string;
}

export interface IAssessmentRepository {
    findById(id: string): Promise<Assessment | null>;
    findAll(filters?: AssessmentFilters): Promise<Assessment[]>;
    save(assessment: Assessment): Promise<Assessment>;
}
