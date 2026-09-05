export type ParticipantStatus = "ASSIGNED" | "NOT_STARTED" | "IN_PROGRESS" | "COMPLETED" | "TIMED_OUT" | "EXPIRED";

export interface TestSessionParticipantProps {
    testSessionId: string;
    userId: string;
    locationId: string | null;
    locationNameSnapshot: string | null;
    departmentId: string | null;
    departmentNameSnapshot: string | null;
    teamId: string | null;
    teamNameSnapshot: string | null;
    status: ParticipantStatus;
    assignedAt?: Date;
    startedAt?: Date | null;
    completedAt?: Date | null;
}

/**
 * Snapshots the participant's organisational assignment at the moment they
 * were assigned to a Test Session. If they later move department/location,
 * this row — and everything reported against it — must keep reporting under
 * where they were assigned, not where they are now (SESSION-BE-002's
 * historic-reporting requirement).
 */
export class TestSessionParticipant {
    public readonly id?: string;
    public readonly props: TestSessionParticipantProps;

    constructor(props: TestSessionParticipantProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get testSessionId(): string {
        return this.props.testSessionId;
    }

    get userId(): string {
        return this.props.userId;
    }

    get locationNameSnapshot(): string | null {
        return this.props.locationNameSnapshot;
    }

    get departmentNameSnapshot(): string | null {
        return this.props.departmentNameSnapshot;
    }

    get teamNameSnapshot(): string | null {
        return this.props.teamNameSnapshot;
    }

    get status(): ParticipantStatus {
        return this.props.status;
    }

    get assignedAt(): Date | undefined {
        return this.props.assignedAt;
    }

    get startedAt(): Date | null | undefined {
        return this.props.startedAt;
    }

    get completedAt(): Date | null | undefined {
        return this.props.completedAt;
    }
}
