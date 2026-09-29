import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";
import { AssessmentStatus } from "../../../domain/AssessmentStatus";
import { Result } from "../../../../../shared/core/Result";

// Direct DRAFT → PUBLISHED for now; APPROVED is accepted too so a future
// review workflow (IN_REVIEW → APPROVED) can hand off to this same step.
const PUBLISHABLE: AssessmentStatus[] = ["DRAFT", "APPROVED"];

export type PublishAssessmentError =
    | "ASSESSMENT_NOT_FOUND"
    | "ASSESSMENT_ALREADY_PUBLISHED"
    | "ASSESSMENT_NOT_PUBLISHABLE"
    | "ASSESSMENT_HAS_NO_QUESTIONS"
    | "ASSESSMENT_HAS_INVALID_QUESTIONS";

/**
 * Publishing freezes the assessment: a published row is never edited again
 * (UpdateAssessmentUseCase enforces that) and Test Sessions deliver it as an
 * immutable version — so it must be complete before it goes out.
 */
export class PublishAssessmentUseCase {
    constructor(private assessmentRepo: IAssessmentRepository) { }

    async execute(id: string): Promise<Result<Assessment>> {
        try {
            const assessment = await this.assessmentRepo.findById(id);
            if (!assessment) return Result.fail<Assessment>("ASSESSMENT_NOT_FOUND");

            if (assessment.status === "PUBLISHED") return Result.fail<Assessment>("ASSESSMENT_ALREADY_PUBLISHED");
            if (!PUBLISHABLE.includes(assessment.status)) return Result.fail<Assessment>("ASSESSMENT_NOT_PUBLISHABLE");

            const questions = assessment.questions ?? [];
            if (questions.length === 0) return Result.fail<Assessment>("ASSESSMENT_HAS_NO_QUESTIONS");

            const allValid = questions.every(
                (q) => q.options.length >= 2 && q.options.some((o) => o.correct)
            );
            if (!allValid) return Result.fail<Assessment>("ASSESSMENT_HAS_INVALID_QUESTIONS");

            const saved = await this.assessmentRepo.save(assessment.publish());
            return Result.ok(saved);
        } catch (error) {
            return Result.fail<Assessment>(`Failed to publish assessment: ${error}`);
        }
    }
}
