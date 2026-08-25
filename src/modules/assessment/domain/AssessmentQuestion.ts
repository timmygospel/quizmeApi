import { AssessmentOption } from "./AssessmentOption";
import { AssessmentQuestionText } from "./valueObjects/AssessmentQuestionText";

export interface AssessmentQuestionProps {
    id?: string;
    question: AssessmentQuestionText;
    options: AssessmentOption[];
}

export class AssessmentQuestion {
    public readonly id?: string;
    public readonly question: AssessmentQuestionText;
    public readonly options: AssessmentOption[];

    constructor(props: AssessmentQuestionProps) {
        this.id = props.id;
        this.question = props.question;
        this.options = props.options || [];
    }
}
