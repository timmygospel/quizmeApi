import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllHostsUseCase } from "../../../application/useCases/getAllHosts/GetAllHostsUseCase";
import { Result } from "../../../../../shared/core/Result";
import { HostMap } from "../../../mappers/HostMap";
import { Host } from "../../../domain/Host";

export class GetAllHostsController extends BaseController {
    constructor(private useCase: GetAllHostsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const result: Result<Host[]> = await this.useCase.execute();

            if (result.isFailure) {
                return this.fail(result.errorValue());
            }

            const dtos = result.getValue().map(HostMap.toDTO);
            return this.ok(dtos);
        } catch (err) {
            return this.fail(err);
        }
    }
}
