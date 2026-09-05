export type AttemptStatus = "IN_PROGRESS" | "SUBMITTED" | "TIMED_OUT";

export interface AttemptProps {
    testSessionId: string;
    testSessionParticipantId: string;
    attemptNumber: number;
    startedAt: Date;
    expiresAt: Date;
    submittedAt?: Date | null;
    status: AttemptStatus;
    scorePercentage: number | null;
    passed: boolean | null;
}

export class Attempt {
    public readonly id?: string;
    public readonly props: AttemptProps;

    constructor(props: AttemptProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get testSessionId(): string {
        return this.props.testSessionId;
    }

    get testSessionParticipantId(): string {
        return this.props.testSessionParticipantId;
    }

    get attemptNumber(): number {
        return this.props.attemptNumber;
    }

    get startedAt(): Date {
        return this.props.startedAt;
    }

    get expiresAt(): Date {
        return this.props.expiresAt;
    }

    get submittedAt(): Date | null | undefined {
        return this.props.submittedAt;
    }

    get status(): AttemptStatus {
        return this.props.status;
    }

    get scorePercentage(): number | null {
        return this.props.scorePercentage;
    }

    get passed(): boolean | null {
        return this.props.passed;
    }
}
