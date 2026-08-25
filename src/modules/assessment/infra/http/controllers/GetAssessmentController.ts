import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAssessmentUseCase } from "../../../application/useCases/getAssessment/GetAssessmentUseCase";
import { AssessmentMap } from "../../../mappers/AssessmentMap";

export class GetAssessmentController extends BaseController {
    constructor(private readonly useCase: GetAssessmentUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const result = await this.useCase.execute(this.req.params.id);

            if (result.isFailure) {
                if (result.errorValue() === "ASSESSMENT_NOT_FOUND") {
                    this.notFound("Assessment not found");
                    return;
                }
                this.fail(result.errorValue());
                return;
            }

            this.ok(AssessmentMap.toDetailDTO(result.getValue()));
        } catch (err) {
            this.fail(err);
        }
    }
}
