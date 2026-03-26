import { BaseController } from "../../../../../shared/core/BaseController";
import { GetParticipantTableUseCase } from "../../../application/useCases/getParticipantTable/GetParticipantTableUseCase";

export class GetParticipantTableController extends BaseController {
    constructor(private useCase: GetParticipantTableUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const { eventCode } = this.req.params;
        const { page, pageSize, sortBy, sortDir, search } = this.req.query as Record<string, string>;

        try {
            const dto = await this.useCase.execute({
                eventCode,
                page: page ? parseInt(page, 10) : undefined,
                pageSize: pageSize ? parseInt(pageSize, 10) : undefined,
                sortBy: sortBy as any,
                sortDir: sortDir as any,
                search,
            });
            this.ok(dto);
        } catch (err: any) {
            if (err?.code === "P2025") {
                this.notFound(`Session '${eventCode}' not found`);
            } else {
                this.fail(err);
            }
        }
    }
}
