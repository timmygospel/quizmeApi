import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";
import { Result } from "../../../../../shared/core/Result";

export class ArchiveAssessmentUseCase {
    constructor(private assessmentRepo: IAssessmentRepository) { }

    async execute(id: string): Promise<Result<Assessment>> {
        try {
            const assessment = await this.assessmentRepo.findById(id);
            if (!assessment) return Result.fail("ASSESSMENT_NOT_FOUND");

            const saved = await this.assessmentRepo.save(assessment.archive());
            return Result.ok(saved);
        } catch (error) {
            return Result.fail(`Failed to archive assessment: ${error}`);
        }
    }
}
