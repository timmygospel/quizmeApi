import { BaseController } from "../../../../../shared/core/BaseController";
import { GetLiveEventParticipantsUseCase } from "../../../application/useCases/getParticipants/GetLiveEventParticipantsUseCase";

export class GetDashboardParticipantsController extends BaseController {
    constructor(private readonly useCase: GetLiveEventParticipantsUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const eventCode = String(this.req.params.eventCode ?? "").trim().toUpperCase();
        const table = await this.useCase.execute(eventCode);
        this.ok(table);
    }
}
