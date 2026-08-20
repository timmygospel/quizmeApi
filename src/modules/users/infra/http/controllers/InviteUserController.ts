import { BaseController } from "../../../../../shared/core/BaseController";
import { InviteUserUseCase } from "../../../application/useCases/inviteUser/InviteUserUseCase";
import { UserMap } from "../../../mappers/UserMap";

export class InviteUserController extends BaseController {
    constructor(private readonly useCase: InviteUserUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const body = this.req.body ?? {};

        const result = await this.useCase.execute({
            email: body.email,
            firstName: body.firstName,
            lastName: body.lastName,
            roleIds: Array.isArray(body.roles)
                ? body.roles.map((r: any) => (typeof r === "string" ? r : r.roleId))
                : body.roleIds,
            departmentId: body.departmentId ?? null,
            locationId: body.locationId ?? null,
        });

        if (result.isFailure) {
            const error = result.errorValue();

            if (error.startsWith("USER_EMAIL_ALREADY_EXISTS")) {
                const [, existingUserId] = error.split(":");
                this.res.status(409).json({
                    message: "This user already belongs to the organisation.",
                    existingUserId,
                });
                return;
            }

            this.clientError(error);
            return;
        }

        this.created(UserMap.toDTO(result.getValue()));
    }
}
