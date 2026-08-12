import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAllSessionsUseCase } from "../../../application/useCases/getAllSessions/GetAllSessionsUseCase";
import { Result } from "../../../../../shared/core/Result";
import { SessionMap } from "../../../mappers/SessionMap";
import { Session } from "../../../domain/Session";

export class GetAllSessionsController extends BaseController {
    constructor(private useCase: GetAllSessionsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<any> {
        try {
            const result: Result<Session[]> = await this.useCase.execute();

            if (result.isFailure) {
                return this.fail(result.errorValue());
            }

            const dtos = result.getValue().map(SessionMap.toDTO);
            return this.ok(dtos);
        } catch (err) {
            return this.fail(err);
        }
    }
}
