import { pgPool } from "../postgres/pgClient";
import { AuditEventInput } from "./AuditEvent";

// Minimal insert-only audit trail (SESSION-BE-002) — no read API yet, since
// none was requested; the existing audit.view permission is seeded ahead of
// a future admin screen that would query this table directly. Never throws:
// a failed audit write must not fail the business operation it's recording.
export async function recordAuditEvent(input: AuditEventInput): Promise<void> {
    try {
        await pgPool.query(
            `INSERT INTO audit_events (actor_user_id, event_type, entity_type, entity_id, metadata)
             VALUES ($1, $2, $3, $4, $5)`,
            [input.actorUserId, input.eventType, input.entityType, input.entityId, JSON.stringify(input.metadata ?? {})]
        );
    } catch (err) {
        console.error("[recordAuditEvent]", err);
    }
}
