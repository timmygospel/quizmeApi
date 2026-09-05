import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { TestSession } from "../../../domain/TestSession";
import { isTestSessionWithinScope } from "../../../domain/audienceScope";
import { resolveTestSessionStatus } from "../../../domain/resolveTestSessionStatus";
import { recordAuditEvent } from "../../../../../shared/infra/audit/recordAuditEvent";

export class CloseTestSessionUseCase {
    constructor(private repo: ITestSessionRepository) { }

    async execute(id: string, actorUserId: string, scope?: EffectiveScope): Promise<Result<TestSession>> {
        try {
            const session = await this.repo.findById(id);
            if (!session || !isTestSessionWithinScope(session, scope)) {
                return Result.fail(`NOT_FOUND: Test session with id ${id} not found`);
            }

            const current = resolveTestSessionStatus(session.status, session.availableFrom, session.availableUntil);
            if (current === "CLOSED" || current === "CANCELLED" || current === "COMPLETED") {
                return Result.fail(`CONFLICT: Test session is already ${current}`);
            }

            const updated = await this.repo.updateStatus(id, "CLOSED", { closedAt: new Date() });

            await recordAuditEvent({
                actorUserId,
                eventType: "TEST_SESSION_CLOSED",
                entityType: "test_session",
                entityId: id,
                metadata: {},
            });

            return Result.ok(updated);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
