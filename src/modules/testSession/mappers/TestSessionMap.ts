import { TestSession, TestSessionStatus } from "../domain/TestSession";
import { AudienceRule } from "../domain/AudienceRule";
import { resolveTestSessionStatus } from "../domain/resolveTestSessionStatus";
import { TestSessionDTO } from "../dtos/TestSessionDTO";

export interface TestSessionRow {
    id: string;
    assessment_id: string;
    name: string;
    owner_id: string;
    available_from: Date;
    available_until: Date;
    time_limit_minutes: number;
    max_attempts: number;
    status: TestSessionStatus;
    created_at: Date;
    started_at: Date | null;
    closed_at: Date | null;
    updated_at: Date;
    participant_count?: string | number | null;
}

export interface AudienceRow {
    location_id: string;
    department_id: string;
    team_id: string | null;
}

export class TestSessionMap {
    public static toDomain(row: TestSessionRow, audienceRows: AudienceRow[]): TestSession {
        const audience: AudienceRule[] = audienceRows.map((a) => ({
            locationId: a.location_id,
            departmentId: a.department_id,
            teamId: a.team_id,
        }));

        return new TestSession(
            {
                assessmentId: row.assessment_id,
                name: row.name,
                ownerId: row.owner_id,
                availableFrom: row.available_from,
                availableUntil: row.available_until,
                timeLimitMinutes: row.time_limit_minutes,
                maxAttempts: row.max_attempts,
                status: row.status,
                audience,
                createdAt: row.created_at,
                startedAt: row.started_at,
                closedAt: row.closed_at,
                updatedAt: row.updated_at,
                participantCount: row.participant_count != null ? Number(row.participant_count) : undefined,
            },
            row.id
        );
    }

    public static toDTO(session: TestSession): TestSessionDTO {
        return {
            id: session.id!,
            assessmentId: session.assessmentId,
            name: session.name,
            ownerId: session.ownerId,
            availableFrom: session.availableFrom.toISOString(),
            availableUntil: session.availableUntil.toISOString(),
            timeLimitMinutes: session.timeLimitMinutes,
            maxAttempts: session.maxAttempts,
            status: resolveTestSessionStatus(session.status, session.availableFrom, session.availableUntil),
            audience: session.audience.map((a) => ({
                locationId: a.locationId,
                departmentId: a.departmentId,
                teamId: a.teamId ?? null,
            })),
            participantCount: session.props.participantCount,
            createdAt: session.createdAt?.toISOString(),
            startedAt: session.startedAt === undefined ? undefined : session.startedAt ? session.startedAt.toISOString() : null,
            closedAt: session.closedAt === undefined ? undefined : session.closedAt ? session.closedAt.toISOString() : null,
            updatedAt: session.updatedAt?.toISOString(),
        };
    }
}
