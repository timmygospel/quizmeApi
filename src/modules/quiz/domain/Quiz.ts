import { Question } from "./Question";
import { QuizTitle } from "./valueObjects/QuizTitle";

/**
 * A Section groups a subset of the quiz's own questions (by id) under a
 * name — e.g. "Fire Hazards", "Exit Procedures". Sessions reference
 * sectionIds to decide which questions are included in a delivery.
 * Kept as plain data (not a value object) since it has no invariants
 * beyond a non-empty name.
 */
export interface QuizSection {
    id?: string;
    name: string;
    questionIds: string[];
}

export interface QuizProps {
    id?: string;
    title: QuizTitle;
    questions: Question[];
    sections?: QuizSection[];
    createdAt?: Date;
    updatedAt?: Date;
}

export class Quiz {
    public readonly id?: string;
    public readonly title: QuizTitle;
    public readonly questions: Question[];
    public readonly sections: QuizSection[];
    public readonly createdAt: Date;
    public readonly updatedAt: Date;

    constructor(props: QuizProps) {
        this.id = props.id;
        this.title = props.title;
        this.questions = props.questions || [];
        this.sections = props.sections || [];
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

    public updateSections(newSections: QuizSection[]): Quiz {
        return new Quiz({ ...this, sections: newSections, updatedAt: new Date() });
    }
}
