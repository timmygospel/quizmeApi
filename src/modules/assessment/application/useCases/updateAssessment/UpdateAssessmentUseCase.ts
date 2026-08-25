import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { UpdateAssessmentDTO } from "./UpdateAssessmentDTO";
import { Assessment } from "../../../domain/Assessment";
import { AssessmentName } from "../../../domain/valueObjects/AssessmentName";
import { AssessmentQuestion } from "../../../domain/AssessmentQuestion";
import { AssessmentQuestionText } from "../../../domain/valueObjects/AssessmentQuestionText";
import { AssessmentOption } from "../../../domain/AssessmentOption";
import { AssessmentOptionText } from "../../../domain/valueObjects/AssessmentOptionText";
import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";

// Full-replace update, mirroring UpdateQuizUseCase's one-shot semantics —
// the whole editable surface (details, pass criteria, attempts, duration,
// questions) is sent together and persisted in one save().
export class UpdateAssessmentUseCase implements UseCase<UpdateAssessmentDTO, Promise<Result<Assessment>>> {
    constructor(private assessmentRepo: IAssessmentRepository) { }

    async execute(dto: UpdateAssessmentDTO): Promise<Result<Assessment>> {
        try {
            const existing = await this.assessmentRepo.findById(dto.id);
            if (!existing) return Result.fail("ASSESSMENT_NOT_FOUND");

            // ASSESSMENTS.md §8: published versions are immutable. Enforced
            // here (not just by hiding Edit in the UI) per AUTH-06 — frontend
            // permission hiding is UX only, never the security boundary.
            if (existing.status === "PUBLISHED") return Result.fail("ASSESSMENT_PUBLISHED_IMMUTABLE");

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

            const questions = (dto.questions ?? [])
                .filter((q) => q.question && q.question.trim().length > 0)
                .map((q) => {
                    const questionTextOrError = AssessmentQuestionText.create(q.question);
                    if (questionTextOrError.isFailure) throw new Error(questionTextOrError.errorValue());

                    const options = (q.options ?? [])
                        .filter((o) => o.text && o.text.trim().length > 0)
                        .map((o) => {
                            const optionTextOrError = AssessmentOptionText.create(o.text);
                            if (optionTextOrError.isFailure) throw new Error(optionTextOrError.errorValue());
                            return new AssessmentOption({ id: o.id, text: optionTextOrError.getValue(), correct: o.correct });
                        });

                    return new AssessmentQuestion({ id: q.id, question: questionTextOrError.getValue(), options });
                });

            const updated = new Assessment({
                id: existing.id,
                name: nameOrError.getValue(),
                description: dto.description?.trim() ?? existing.description,
                categoryId: dto.categoryId !== undefined ? dto.categoryId : existing.categoryId,
                categoryName: null,
                questionCount: questions.length,
                questions,
                passMark: dto.passMark,
                maxAttempts: dto.maxAttempts ?? null,
                durationMinutes: dto.durationMinutes ?? null,
                status: existing.status,
                createdBy: existing.createdBy,
                createdByName: null,
                createdAt: existing.createdAt,
            });

            const saved = await this.assessmentRepo.save(updated);
            return Result.ok(saved);
        } catch (error) {
            return Result.fail(`Failed to update assessment: ${error}`);
        }
    }
}
