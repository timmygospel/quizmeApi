import { Quiz } from "../domain/Quiz";
import { Question } from "../domain/Question";
import { Option } from "../domain/Option";
import { QuizDTO } from "../application/useCases/getQuiz/GetQuizDTO";
import { QuizTitle } from "../domain/valueObjects/QuizTitle";
import { QuestionText } from "../domain/valueObjects/QuestionText";
import { OptionText } from "../domain/valueObjects/OptionText";

export interface QuizRow {
    id: string;
    title: string;
    created_at: Date;
    updated_at: Date;
}

export interface QuestionRow {
    id: string;
    quiz_id: string;
    question_text: string;
    display_order: number;
}

export interface OptionRow {
    id: string;
    question_id: string;
    text: string;
    is_correct: boolean;
    display_order: number;
}

export interface SectionRow {
    id: string;
    quiz_id: string;
    name: string;
    display_order: number;
}

export interface SectionQuestionRow {
    section_id: string;
    question_id: string;
}

export interface QuizRows {
    quiz: QuizRow;
    questions: QuestionRow[];
    options: OptionRow[];
    sections: SectionRow[];
    sectionQuestions: SectionQuestionRow[];
}

export class QuizMap {
    // ✅ Postgres rows → Domain
    public static toDomain(raw: QuizRows): Quiz {
        const titleOrError = QuizTitle.create(raw.quiz.title);
        if (titleOrError.isFailure) throw new Error(titleOrError.errorValue());

        const optionsByQuestion = new Map<string, OptionRow[]>();
        for (const o of raw.options) {
            const list = optionsByQuestion.get(o.question_id) ?? [];
            list.push(o);
            optionsByQuestion.set(o.question_id, list);
        }

        const questions = raw.questions.map((q) => {
            const questionTextOrError = QuestionText.create(q.question_text);
            if (questionTextOrError.isFailure) throw new Error(questionTextOrError.errorValue());

            const options = (optionsByQuestion.get(q.id) ?? []).map((o) => {
                const optionTextOrError = OptionText.create(o.text);
                if (optionTextOrError.isFailure) throw new Error(optionTextOrError.errorValue());

                return new Option({
                    id: o.id,
                    text: optionTextOrError.getValue(),
                    correct: o.is_correct,
                });
            });

            return new Question({
                id: q.id,
                question: questionTextOrError.getValue(),
                options,
            });
        });

        const questionIdsBySection = new Map<string, string[]>();
        for (const sq of raw.sectionQuestions) {
            const list = questionIdsBySection.get(sq.section_id) ?? [];
            list.push(sq.question_id);
            questionIdsBySection.set(sq.section_id, list);
        }

        const sections = raw.sections.map((s) => ({
            id: s.id,
            name: s.name,
            questionIds: questionIdsBySection.get(s.id) ?? [],
        }));

        return new Quiz({
            id: raw.quiz.id,
            title: titleOrError.getValue(),
            questions,
            sections,
            createdAt: raw.quiz.created_at,
            updatedAt: raw.quiz.updated_at,
        });
    }

    // ✅ Domain → DTO
    public static toDTO(quiz: Quiz): QuizDTO {
        return {
            id: quiz.id!,
            title: quiz.title.value,
            questions: quiz.questions.map((q) => ({
                id: q.id,
                question: q.question.value,
                options: q.options.map((o) => ({
                    id: o.id,
                    text: o.text.value,
                    correct: o.correct,
                })),
            })),
            sections: quiz.sections.map((s) => ({
                id: s.id!,
                name: s.name,
                questionIds: s.questionIds,
            })),
            createdAt: quiz.createdAt.toISOString(),
            updatedAt: quiz.updatedAt.toISOString(),
        };
    }
}
