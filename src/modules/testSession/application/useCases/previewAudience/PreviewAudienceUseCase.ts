import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository, AudiencePreviewResult } from "../../../domain/ITestSessionRepository";
import { isAudienceWithinScope } from "../../../domain/audienceScope";
import { PreviewAudienceDTO } from "./PreviewAudienceDTO";

export class PreviewAudienceUseCase {
    constructor(private testSessionRepo: ITestSessionRepository) { }

    async execute(dto: PreviewAudienceDTO, scope?: EffectiveScope): Promise<Result<AudiencePreviewResult>> {
        try {
            const rules = dto.audience ?? [];
            if (rules.length === 0) {
                return Result.fail("Select at least one location and department to preview");
            }
            for (const rule of rules) {
                if (!rule.locationId || !rule.departmentId) {
                    return Result.fail("Each audience rule requires a location and a department");
                }
            }

            if (!isAudienceWithinScope(rules, scope)) {
                return Result.fail("FORBIDDEN: one or more audience rules are outside your permitted scope");
            }

            const preview = await this.testSessionRepo.previewAudience(rules);
            return Result.ok(preview);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
