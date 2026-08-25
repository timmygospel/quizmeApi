import { BaseController } from "../../../../../shared/core/BaseController";
import { DuplicateAssessmentUseCase } from "../../../application/useCases/duplicateAssessment/DuplicateAssessmentUseCase";
import { AssessmentMap } from "../../../mappers/AssessmentMap";

export class DuplicateAssessmentController extends BaseController {
    constructor(private readonly useCase: DuplicateAssessmentUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const result = await this.useCase.execute({
                id: this.req.params.id,
                requestedBy: this.req.authUser?.id ?? null,
            });

            if (result.isFailure) {
                if (result.errorValue() === "ASSESSMENT_NOT_FOUND") {
                    this.notFound("Assessment not found");
                    return;
                }
                this.clientError(result.errorValue());
                return;
            }

            this.created(AssessmentMap.toDTO(result.getValue()));
        } catch (error) {
            this.fail(error);
        }
    }
}
