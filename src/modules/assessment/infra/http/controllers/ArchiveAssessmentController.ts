import { BaseController } from "../../../../../shared/core/BaseController";
import { ArchiveAssessmentUseCase } from "../../../application/useCases/archiveAssessment/ArchiveAssessmentUseCase";
import { AssessmentMap } from "../../../mappers/AssessmentMap";

export class ArchiveAssessmentController extends BaseController {
    constructor(private readonly useCase: ArchiveAssessmentUseCase) {
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
                this.clientError(result.errorValue());
                return;
            }

            this.ok(AssessmentMap.toDTO(result.getValue()));
        } catch (error) {
            this.fail(error);
        }
    }
}
