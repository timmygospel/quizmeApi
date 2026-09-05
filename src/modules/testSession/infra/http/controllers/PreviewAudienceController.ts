import { BaseController } from "../../../../../shared/core/BaseController";
import { PreviewAudienceUseCase } from "../../../application/useCases/previewAudience/PreviewAudienceUseCase";
import { AudienceRuleDTO } from "../../../application/useCases/previewAudience/PreviewAudienceDTO";
import { mapFailure } from "./mapFailure";

// Accepts either the paired-rule shape used by Create ({ audience: [{locationId,
// departmentId, teamId?}] }) or the flatter { locationIds, departmentIds }
// exploration shape from the spec's own audience-preview example, expanded
// here into the full cross-product of pairs — a pure input-shape concern,
// not business logic, so it lives at the controller boundary.
function crossProduct(locationIds: string[], departmentIds: string[]): AudienceRuleDTO[] {
    const rules: AudienceRuleDTO[] = [];
    for (const locationId of locationIds) {
        for (const departmentId of departmentIds) {
            rules.push({ locationId, departmentId });
        }
    }
    return rules;
}

export class PreviewAudienceController extends BaseController {
    constructor(private readonly useCase: PreviewAudienceUseCase) {
        super();
    }

    protected async executeImpl(): Promise<void> {
        const body = this.req.body ?? {};
        const audience: AudienceRuleDTO[] = Array.isArray(body.audience)
            ? body.audience
            : crossProduct(body.locationIds ?? [], body.departmentIds ?? []);

        const result = await this.useCase.execute({ audience }, this.req.effectiveScope);
        if (result.isFailure) {
            mapFailure(this, result.errorValue());
            return;
        }

        const { total, groups } = result.getValue();
        this.ok({
            total,
            groups: groups.map((g) => ({
                locationId: g.locationId,
                location: g.locationName,
                departmentId: g.departmentId,
                department: g.departmentName,
                count: g.count,
            })),
        });
    }
}
