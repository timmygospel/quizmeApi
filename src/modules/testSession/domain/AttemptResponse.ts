export interface AttemptResponseProps {
    testAttemptId: string;
    assessmentQuestionId: string;
    selectedOptionId: string | null;
    isCorrect: boolean | null;
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

    get answeredAt(): Date | undefined {
        return this.props.answeredAt;
    }
}
