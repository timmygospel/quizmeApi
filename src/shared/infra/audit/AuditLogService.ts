/**
 * AuditLogService
 *
 * Fire-and-forget logging of key system actions to the `AuditLog` table.
 * All methods are async but callers should NOT await them — a DB failure
 * must never block the primary request.
 */

import { prisma } from "../prisma/prismaClient";
import { Prisma } from "../../../generated/prisma/client";

export type AuditAction =
    | "dashboard.view.summary"
    | "dashboard.view.participants"
    | "dashboard.view.questions"
    | "dashboard.view.topics"
    | "dashboard.view.score-distribution"
    | "dashboard.view.live"
    | "dashboard.export.csv"
    | "quiz.create"
    | "quiz.update"
    | "quiz.delete"
    | "live-event.create";

export interface AuditContext {
    userId?: string;
    sessionId?: string;
    meta?: Record<string, unknown>;
}

export class AuditLogService {
    static log(action: AuditAction, ctx: AuditContext = {}): void {
        prisma.auditLog
            .create({
                data: {
                    action,
                    userId: ctx.userId ?? null,
                    sessionId: ctx.sessionId ?? null,
                    meta: ctx.meta ? (ctx.meta as Prisma.InputJsonValue) : undefined,
                },
            })
            .catch((err) =>
                console.error(
                    JSON.stringify({
                        ts: new Date().toISOString(),
                        level: "error",
                        msg: "AuditLogService.log failed",
                        action,
                        err: String(err),
                    }),
                ),
            );
    }
}
