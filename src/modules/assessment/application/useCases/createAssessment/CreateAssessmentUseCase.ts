import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { CreateAssessmentDTO } from "./CreateAssessmentDTO";
import { Assessment } from "../../../domain/Assessment";
import { AssessmentName } from "../../../domain/valueObjects/AssessmentName";
import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";

export class CreateAssessmentUseCase implements UseCase<CreateAssessmentDTO, Promise<Result<Assessment>>> {
    constructor(private assessmentRepo: IAssessmentRepository) { }

    async execute(dto: CreateAssessmentDTO): Promise<Result<Assessment>> {
        try {
            const nameOrError = AssessmentName.create(dto.name);
            if (nameOrError.isFailure) return Result.fail(nameOrError.errorValue());

            if (dto.passMark == null || dto.passMark < 0 || dto.passMark > 100) {
                return Result.fail("Pass mark must be between 0% and 100%");
            }
            if (dto.maxAttempts != null && dto.maxAttempts <= 0) {
                return Result.fail("Maximum attempts must be greater than 0");
            }
            if (dto.durationMinutes != null && dto.durationMinutes <= 0) {
                return Result.fail("Time limit must be greater than 0 minutes");
            }

            const assessment = new Assessment({
                name: nameOrError.getValue(),
                description: dto.description?.trim() ?? "",
                categoryId: dto.categoryId ?? null,
                categoryName: null,
                questionCount: 0,
                passMark: dto.passMark,
                maxAttempts: dto.maxAttempts ?? null,
                durationMinutes: dto.durationMinutes ?? null,
                status: "DRAFT",
                createdBy: dto.createdBy,
                createdByName: null,
            });

            const saved = await this.assessmentRepo.save(assessment);
            return Result.ok(saved);
        } catch (error) {
            return Result.fail(`Failed to create assessment: ${error}`);
        }
    }
}
