import { BaseController } from "../../../../../shared/core/BaseController";
import { SetQuizArchivedUseCase } from "../../../application/useCases/setQuizArchived/SetQuizArchivedUseCase";
import { QuizMap } from "../../../mappers/QuizMap";

export class SetQuizArchivedController extends BaseController {
    constructor(private useCase: SetQuizArchivedUseCase, private archived: boolean) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const id = this.req.params.id;
            const outcome = await this.useCase.execute(id, this.archived);

            if (!outcome.ok) {
                return this.notFound(`Knowledge Module with id ${id} not found`);
            }

            return this.ok(QuizMap.toDTO(outcome.quiz));
        } catch (err) {
            return this.fail(err);
        }
    }
}
