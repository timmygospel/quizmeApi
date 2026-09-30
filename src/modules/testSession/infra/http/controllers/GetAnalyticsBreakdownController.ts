import { BaseController } from "../../../../../shared/core/BaseController";
import { GetAnalyticsBreakdownUseCase } from "../../../application/useCases/getAnalyticsBreakdown/GetAnalyticsBreakdownUseCase";
import { AnalyticsGroupBy } from "../../../domain/ITestSessionRepository";
import { mapFailure } from "./mapFailure";

const VALID_GROUP_BY: AnalyticsGroupBy[] = ["location", "department", "team"];

export class GetAnalyticsBreakdownController extends BaseController {
    constructor(private readonly useCase: GetAnalyticsBreakdownUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const id = String(this.req.params.id);
        const groupByRaw = String(this.req.query.groupBy ?? "location");
        const groupBy = (VALID_GROUP_BY as string[]).includes(groupByRaw) ? (groupByRaw as AnalyticsGroupBy) : "location";

        // ?locationId=… drills into one location (e.g. its departments)
        const locationId = typeof this.req.query.locationId === "string" && this.req.query.locationId ? this.req.query.locationId : undefined;

        const result = await this.useCase.execute(id, groupBy, this.req.effectiveScope, locationId);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }
        this.ok(result.getValue());
    }
}
