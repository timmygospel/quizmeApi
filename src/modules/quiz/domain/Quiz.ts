import { Question } from "./Question";
import { QuizTitle } from "./valueObjects/QuizTitle";

export interface QuizProps {
    id?: string;
    title: QuizTitle;
    questions: Question[];
    createdAt?: Date;
    updatedAt?: Date;
}

export class Quiz {
    public readonly id?: string;
    public readonly title: QuizTitle;
    public readonly questions: Question[];
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(props: QuizProps) {
        this.id = props.id;
        this.title = props.title;
        this.questions = props.questions || [];
        this.createdAt = props.createdAt || new Date();
        this.updatedAt = props.updatedAt || new Date();
    }

    public updateTitle(newTitle: QuizTitle): Quiz {
        return new Quiz({ ...this, title: newTitle, updatedAt: new Date() });
    }

    public updateQuestions(newQuestions: Question[]): Quiz {
        return new Quiz({ ...this, questions: newQuestions, updatedAt: new Date() });
    }

    public addQuestion(question: Question): Quiz {
        return new Quiz({ ...this, questions: [...this.questions, question], updatedAt: new Date() });
    }
}
