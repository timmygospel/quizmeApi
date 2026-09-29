import { BaseController } from "../../../../../shared/core/BaseController";
import { PublishAssessmentUseCase } from "../../../application/useCases/publishAssessment/PublishAssessmentUseCase";
import { AssessmentMap } from "../../../mappers/AssessmentMap";

export class PublishAssessmentController extends BaseController {
    constructor(private readonly useCase: PublishAssessmentUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const result = await this.useCase.execute(this.req.params.id);

            if (result.isFailure) {
                switch (result.errorValue()) {
                    case "ASSESSMENT_NOT_FOUND":
                        this.notFound("Assessment not found");
                        return;
                    case "ASSESSMENT_ALREADY_PUBLISHED":
                        this.conflict("This assessment is already published.");
                        return;
                    case "ASSESSMENT_NOT_PUBLISHABLE":
                        this.conflict("Only draft or approved assessments can be published.");
                        return;
                    case "ASSESSMENT_HAS_NO_QUESTIONS":
                        this.clientError("Add at least one question before publishing.");
                        return;
                    case "ASSESSMENT_HAS_INVALID_QUESTIONS":
                        this.clientError("Every question needs at least two options and a correct answer before publishing.");
                        return;
                    default:
                        this.fail(result.errorValue());
                        return;
                }
            }

            this.ok(AssessmentMap.toDTO(result.getValue()));
        } catch (error) {
            this.fail(error);
        }
    }
}
