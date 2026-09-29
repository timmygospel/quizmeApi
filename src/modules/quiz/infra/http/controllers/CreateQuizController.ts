import { BaseController } from "../../../../../shared/core/BaseController";
import { CreateQuizUseCase } from "../../../application/useCases/createQuiz/CreateQuizUseCase";
import { CreateQuizDTO } from "../../../application/useCases/createQuiz/createQuizDTO";
import { QuizMap } from "../../../mappers/QuizMap";
import { mapFailure } from "./mapFailure";

export class CreateQuizController extends BaseController {
    constructor(private readonly useCase: CreateQuizUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const dto: CreateQuizDTO = this.req.body;

            const result = await this.useCase.execute(dto);

            if (result.isFailure) {
                mapFailure(this, result.errorValue());
                return;
            }

            this.created(QuizMap.toDTO(result.getValue()));
        } catch (error) {
            this.fail(error);
        }
    }
}
