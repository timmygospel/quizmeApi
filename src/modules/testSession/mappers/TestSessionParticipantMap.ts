import { TestSessionParticipant, ParticipantStatus } from "../domain/TestSessionParticipant";

export interface ParticipantRow {
    id: string;
    test_session_id: string;
    user_id: string;
    location_id: string | null;
    location_name_snapshot: string | null;
    department_id: string | null;
    department_name_snapshot: string | null;
    team_id: string | null;
    team_name_snapshot: string | null;
    status: ParticipantStatus;
    assigned_at: Date;
    started_at: Date | null;
    completed_at: Date | null;
}

export class TestSessionParticipantMap {
    public static toDomain(row: ParticipantRow): TestSessionParticipant {
        return new TestSessionParticipant(
            {
                testSessionId: row.test_session_id,
                userId: row.user_id,
                locationId: row.location_id,
                locationNameSnapshot: row.location_name_snapshot,
                departmentId: row.department_id,
                departmentNameSnapshot: row.department_name_snapshot,
                teamId: row.team_id,
                teamNameSnapshot: row.team_name_snapshot,
                status: row.status,
                assignedAt: row.assigned_at,
                startedAt: row.started_at,
                completedAt: row.completed_at,
            },
            row.id
        );
    }
}
