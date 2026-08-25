import { Result } from "../../../../../shared/core/Result";
import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";

export class GetAssessmentUseCase {
    constructor(private repo: IAssessmentRepository) { }

    async execute(id: string): Promise<Result<Assessment>> {
        try {
            const assessment = await this.repo.findById(id);
            if (!assessment) return Result.fail("ASSESSMENT_NOT_FOUND");
            return Result.ok(assessment);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
