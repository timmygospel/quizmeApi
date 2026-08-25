import { BaseController } from "../../../../../shared/core/BaseController";
import { UpdateAssessmentUseCase } from "../../../application/useCases/updateAssessment/UpdateAssessmentUseCase";
import { UpdateAssessmentDTO } from "../../../application/useCases/updateAssessment/UpdateAssessmentDTO";
import { AssessmentMap } from "../../../mappers/AssessmentMap";

export class UpdateAssessmentController extends BaseController {
    constructor(private readonly useCase: UpdateAssessmentUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const body = this.req.body ?? {};
            const dto: UpdateAssessmentDTO = {
                id: this.req.params.id,
                name: body.name,
                description: body.description,
                categoryId: body.categoryId,
                passMark: body.passMark,
                maxAttempts: body.maxAttempts ?? null,
                durationMinutes: body.durationMinutes ?? null,
                questions: body.questions ?? [],
            };

            const result = await this.useCase.execute(dto);

            if (result.isFailure) {
                if (result.errorValue() === "ASSESSMENT_NOT_FOUND") {
                    this.notFound("Assessment not found");
                    return;
                }
                if (result.errorValue() === "ASSESSMENT_PUBLISHED_IMMUTABLE") {
                    this.conflict("Published assessments can't be edited directly — create a new version instead.");
                    return;
                }
                this.clientError(result.errorValue());
                return;
            }

            this.ok(AssessmentMap.toDetailDTO(result.getValue()));
        } catch (error) {
            this.fail(error);
        }
    }
}
