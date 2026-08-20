import { BaseController } from "../../../../../shared/core/BaseController";
import { ResendInvitationUseCase } from "../../../application/useCases/resendInvitation/ResendInvitationUseCase";
import { UserMap } from "../../../mappers/UserMap";

export class ResendInvitationController extends BaseController {
    constructor(private readonly useCase: ResendInvitationUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const result = await this.useCase.execute(id);

        if (result.isFailure) {
            const error = result.errorValue();

            if (error === "USER_NOT_FOUND") {
                this.notFound(`User with id ${id} not found`);
                return;
            }

            if (error === "USER_NOT_INVITED") {
                this.conflict("Only users with a pending invitation can be resent one.");
                return;
            }

            this.fail(error);
            return;
        }

        this.ok(UserMap.toDTO(result.getValue()));
    }
}
