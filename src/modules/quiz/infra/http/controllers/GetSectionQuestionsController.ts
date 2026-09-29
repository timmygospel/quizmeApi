import { BaseController } from "../../../../../shared/core/BaseController";
import { GetSectionQuestionsUseCase } from "../../../application/useCases/getSectionQuestions/GetSectionQuestionsUseCase";
import { QuizMap } from "../../../mappers/QuizMap";
import { mapFailure } from "./mapFailure";

export class GetSectionQuestionsController extends BaseController {
    constructor(private readonly useCase: GetSectionQuestionsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const result = await this.useCase.execute({
            quizId: String(this.req.params.id),
            sectionId: String(this.req.params.sectionId),
        });

        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }

        const { quizId, section, position, questions } = result.getValue();
        this.ok({
            quizId,
            section: { id: section.id!, name: section.name, position, questionIds: section.questionIds },
            questions: questions.map((q) => QuizMap.questionToDTO(q, section.id!)),
        });
    }
}
