import { Question } from "./Question";
import { QuizTitle } from "./valueObjects/QuizTitle";
import { Result } from "../../../shared/core/Result";

/**
 * A Section is a named group of the quiz's own questions — e.g. "Product
 * Knowledge", "Handling Objections" — owned by the quiz: it can't exist
 * without it and never holds another quiz's questions. Sessions reference
 * sectionIds to decide which questions are included in a delivery.
 *
 * Order is positional: the quiz's `sections` array is the section order and
 * `questionIds` is the question order within the section. A question is in
 * at most one section; a question in none is Unassigned.
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

    /**
     * The section invariants: every section has a name, section ids are
     * unique, and every assigned question is one of this quiz's questions
     * and sits in at most one section.
     */
    public static validateSections(questions: Question[], sections: QuizSection[]): Result<void> {
        const questionIds = new Set(questions.map((q) => q.id).filter((id): id is string => !!id));
        const sectionIds = new Set<string>();
        const assigned = new Set<string>();

        for (const section of sections) {
            if (!section.name || section.name.trim().length === 0) {
                return Result.fail("Section name is required");
            }
            if (section.id) {
                if (sectionIds.has(section.id)) return Result.fail(`Duplicate section id ${section.id}`);
                sectionIds.add(section.id);
            }
            for (const questionId of section.questionIds) {
                if (!questionIds.has(questionId)) {
                    return Result.fail(`Question ${questionId} is not part of this Knowledge Module`);
                }
                if (assigned.has(questionId)) {
                    return Result.fail(`Question ${questionId} is assigned to more than one section`);
                }
                assigned.add(questionId);
            }
        }

        return Result.ok();
    }

    /** Id of the section containing the question, or null when it's Unassigned. */
    public sectionIdOf(questionId: string | undefined): string | null {
        if (!questionId) return null;
        return this.sections.find((s) => s.questionIds.includes(questionId))?.id ?? null;
    }

    /** Question ids not in any section, in quiz question order. */
    public get unassignedQuestionIds(): string[] {
        const assigned = new Set(this.sections.flatMap((s) => s.questionIds));
        return this.questions
            .map((q) => q.id)
            .filter((id): id is string => !!id && !assigned.has(id));
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
