import { BaseController } from "../../../../../shared/core/BaseController";
import { CreateHostUseCase } from "../../../application/useCases/createHost/CreateHostUseCase";
import { HostMap } from "../../../mappers/HostMap";

export class CreateHostController extends BaseController {
    constructor(private readonly useCase: CreateHostUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        try {
            const name = this.req.body?.name;

            const result = await this.useCase.execute({ name });

            if (result.isFailure) {
                if (result.errorValue() === "HOST_NAME_ALREADY_EXISTS") {
                    this.conflict("Host name already exists");
                    return;
                }
                this.clientError(result.errorValue());
                return;
            }

            this.ok(HostMap.toDTO(result.getValue()));
        } catch (error: any) {
            if (error?.message === "HOST_NAME_ALREADY_EXISTS") {
                this.conflict("Host name already exists");
                return;
            }
            this.fail(error);
        }
    }
}
