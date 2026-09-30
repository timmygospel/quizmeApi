export interface AttemptResponseProps {
    testAttemptId: string;
    assessmentQuestionId: string;
    selectedOptionId: string | null;
    isCorrect: boolean | null;
    /** Participant's own "come back to this" flag; a flagged but unanswered question has a null selection. */
    markedForReview?: boolean;
    answeredAt?: Date;
}

export class AttemptResponse {
    public readonly id?: string;
    public readonly props: AttemptResponseProps;

    constructor(props: AttemptResponseProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get testAttemptId(): string {
        return this.props.testAttemptId;
    }

    get assessmentQuestionId(): string {
        return this.props.assessmentQuestionId;
    }

    get selectedOptionId(): string | null {
        return this.props.selectedOptionId;
    }

    get isCorrect(): boolean | null {
        return this.props.isCorrect;
    }

    get markedForReview(): boolean {
        return this.props.markedForReview ?? false;
    }

    get answeredAt(): Date | undefined {
        return this.props.answeredAt;
    }
}
