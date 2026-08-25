import { BaseController } from "../../../core/BaseController";
import { AuthCapabilities } from "../../auth/IAuthProvider";
import { GetUserEffectiveAccessUseCase } from "../../../../modules/users/application/useCases/getUserEffectiveAccess/GetUserEffectiveAccessUseCase";
import { UserMap } from "../../../../modules/users/mappers/UserMap";

export class MeController extends BaseController {
    constructor(
        private readonly getUserEffectiveAccessUseCase: GetUserEffectiveAccessUseCase,
        private readonly authCapabilities: AuthCapabilities | null
    ) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const user = this.req.authUser;
        if (!user?.id) {
            this.unauthorized("Not authenticated");
            return;
        }

        const result = await this.getUserEffectiveAccessUseCase.execute(user.id);
        if (result.isFailure) {
            this.fail(result.errorValue());
            return;
        }

        this.ok({
            user: UserMap.toDTO(user),
            effectiveAccess: result.getValue(),
            authCapabilities: this.authCapabilities,
        });
    }
}
