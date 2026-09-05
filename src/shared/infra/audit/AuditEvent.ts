export interface AuditEventInput {
    actorUserId: string | null;
    eventType: string;
    entityType: string;
    entityId: string | null;
    metadata?: Record<string, unknown>;
}
