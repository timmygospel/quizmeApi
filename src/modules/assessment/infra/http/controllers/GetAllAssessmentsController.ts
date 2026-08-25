import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllAssessmentsUseCase } from "../../../application/useCases/getAllAssessments/GetAllAssessmentsUseCase";
import { AssessmentMap } from "../../../mappers/AssessmentMap";

export class GetAllAssessmentsController extends BaseController {
    constructor(private useCase: GetAllAssessmentsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const { search, status, categoryId } = this.req.query as Record<string, string | undefined>;

            const result = await this.useCase.execute({ search, status, categoryId });

            if (result.isFailure) {
                this.fail(result.errorValue());
                return;
            }

            this.ok(result.getValue().map((a) => AssessmentMap.toDTO(a)));
        } catch (err) {
            this.fail(err);
        }
    }
}
