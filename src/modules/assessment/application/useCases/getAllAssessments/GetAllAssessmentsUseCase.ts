import { Result } from "../../../../../shared/core/Result";
import { IAssessmentRepository, AssessmentFilters } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";

export class GetAllAssessmentsUseCase {
    constructor(private repo: IAssessmentRepository) { }

    async execute(filters: AssessmentFilters = {}): Promise<Result<Assessment[]>> {
        try {
            const assessments = await this.repo.findAll(filters);
            return Result.ok(assessments);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
