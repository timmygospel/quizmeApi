import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllQuizzesUseCase } from "../../../application/useCases/getAllQuizzes/GetAllQuizzesUseCase";
import { Result } from "../../../../../shared/core/Result";

export class GetAllQuizzesController extends BaseController {
    constructor(private useCase: GetAllQuizzesUseCase) {
        super();
    }

    /**
     * The BaseController provides `req` and `res` on `this`,
     * so we can access `this.req`, `this.res`
     */

    protected async executeImpl(): Promise<any> {
        try {
            const result: Result<any[]> = await this.useCase.execute();

            if (result.isFailure) {
                return this.fail(result.errorValue());
            }

            return this.ok(result.getValue());
        } catch (err) {
            return this.fail(err);
        }
    }
}