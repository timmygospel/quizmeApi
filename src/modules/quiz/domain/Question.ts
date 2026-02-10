import { Option } from "./Option";
import { QuestionText } from "./valueObjects/QuestionText";

export interface QuestionProps {
    id?: string;
    question: QuestionText;
    options: Option[];
}

export class Question {
    public readonly id?: string;
    public readonly question: QuestionText;
    public readonly options: Option[];

    constructor(props: QuestionProps) {
        this.id = props.id;
        this.question = props.question;
        this.options = props.options || [];
    }

    public updateText(newText: QuestionText): Question {
        return new Question({ ...this, question: newText });
    }

    public updateOptions(newOptions: Option[]): Question {
        return new Question({ ...this, options: newOptions });
    }
}
