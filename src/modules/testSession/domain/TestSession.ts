import { AudienceRule } from "./AudienceRule";

export type TestSessionStatus = "DRAFT" | "SCHEDULED" | "OPEN" | "CLOSED" | "COMPLETED" | "CANCELLED";

export interface TestSessionProps {
    assessmentId: string;
    name: string;
    ownerId: string;
    availableFrom: Date;
    availableUntil: Date;
    timeLimitMinutes: number;
    maxAttempts: number;
    status: TestSessionStatus;
    audience: AudienceRule[];
    // Denormalized display data hydrated by the repository join — not a
    // domain invariant, same treatment Assessment.categoryName gives similar
    // data. Undefined until persisted/reloaded.
    participantCount?: number;
    createdAt?: Date;
    startedAt?: Date | null;
    closedAt?: Date | null;
    updatedAt?: Date;
}

/**
 * A Test Session delivers exactly one immutable published Assessment
 * (assessmentId) to an organisational audience, resolved at creation time
 * into explicit TestSessionParticipant rows. `status` here is the last
 * explicitly-set value (DRAFT is unused today — creation always yields
 * SCHEDULED/OPEN based on the availability window; CLOSED/CANCELLED only
 * via their own endpoints); see resolveTestSessionStatus.ts for the
 * date-driven SCHEDULED->OPEN->CLOSED value actually shown to clients.
 */
export class TestSession {
    public readonly id?: string;
    public readonly props: TestSessionProps;

    constructor(props: TestSessionProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get assessmentId(): string {
        return this.props.assessmentId;
    }

    get name(): string {
        return this.props.name;
    }

    get ownerId(): string {
        return this.props.ownerId;
    }

    get availableFrom(): Date {
        return this.props.availableFrom;
    }

    get availableUntil(): Date {
        return this.props.availableUntil;
    }

    get timeLimitMinutes(): number {
        return this.props.timeLimitMinutes;
    }

    get maxAttempts(): number {
        return this.props.maxAttempts;
    }

    get status(): TestSessionStatus {
        return this.props.status;
    }

    get audience(): AudienceRule[] {
        return this.props.audience;
    }

    get createdAt(): Date | undefined {
        return this.props.createdAt;
    }

    get startedAt(): Date | null | undefined {
        return this.props.startedAt;
    }

    get closedAt(): Date | null | undefined {
        return this.props.closedAt;
    }

    get updatedAt(): Date | undefined {
        return this.props.updatedAt;
    }
}
