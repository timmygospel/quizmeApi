import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";
import { AssessmentName } from "../../../domain/valueObjects/AssessmentName";
import { Result } from "../../../../../shared/core/Result";
import { DuplicateAssessmentDTO } from "./DuplicateAssessmentDTO";

export class DuplicateAssessmentUseCase {
    constructor(private assessmentRepo: IAssessmentRepository) { }

    async execute(dto: DuplicateAssessmentDTO): Promise<Result<Assessment>> {
        try {
            const original = await this.assessmentRepo.findById(dto.id);
            if (!original) return Result.fail("ASSESSMENT_NOT_FOUND");

            const nameOrError = AssessmentName.create(`${original.name.value} (Copy)`);
            if (nameOrError.isFailure) return Result.fail(nameOrError.errorValue());

            const copy = new Assessment({
                name: nameOrError.getValue(),
                description: original.description,
                categoryId: original.categoryId,
                categoryName: null,
                questionCount: original.questionCount,
                passMark: original.passMark,
                maxAttempts: original.maxAttempts,
                durationMinutes: original.durationMinutes,
                status: "DRAFT",
                createdBy: dto.requestedBy,
                createdByName: null,
            });

            const saved = await this.assessmentRepo.save(copy);
            return Result.ok(saved);
        } catch (error) {
            return Result.fail(`Failed to duplicate assessment: ${error}`);
        }
    }
}
