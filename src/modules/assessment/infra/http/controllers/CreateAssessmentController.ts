import { BaseController } from "../../../../../shared/core/BaseController";
import { CreateAssessmentUseCase } from "../../../application/useCases/createAssessment/CreateAssessmentUseCase";
import { CreateAssessmentDTO } from "../../../application/useCases/createAssessment/CreateAssessmentDTO";
import { AssessmentMap } from "../../../mappers/AssessmentMap";

export class CreateAssessmentController extends BaseController {
    constructor(private readonly useCase: CreateAssessmentUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const body = this.req.body ?? {};
            const dto: CreateAssessmentDTO = {
                name: body.name,
                description: body.description,
                categoryId: body.categoryId ?? null,
                passMark: body.passMark,
                maxAttempts: body.maxAttempts ?? null,
                durationMinutes: body.durationMinutes ?? null,
                createdBy: this.req.authUser?.id ?? null,
            };

            const result = await this.useCase.execute(dto);

            if (result.isFailure) {
                this.clientError(result.errorValue());
                return;
            }

            this.created(AssessmentMap.toDTO(result.getValue()));
        } catch (error) {
            this.fail(error);
        }
    }
}
