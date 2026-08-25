import { AssessmentOptionText } from "./valueObjects/AssessmentOptionText";

export interface AssessmentOptionProps {
    id?: string;
    text: AssessmentOptionText;
    correct: boolean;
}

export class AssessmentOption {
    public readonly id?: string;
    public readonly text: AssessmentOptionText;
    public readonly correct: boolean;

    constructor(props: AssessmentOptionProps) {
        this.id = props.id;
        this.text = props.text;
        this.correct = props.correct;
    }
}
