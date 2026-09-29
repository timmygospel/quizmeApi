// src/modules/quiz/application/useCases/getQuiz/GetQuizDTO.ts

export interface OptionDTO {
    id?: string;
    text: string;
    correct: boolean;
}

export interface QuestionDTO {
    id?: string;
    question: string;
    options: OptionDTO[];
    /** The question's section, or null when it's Unassigned. */
    sectionId: string | null;
}

/** Sections are returned in section order; `questionIds` in order within the section. */
export interface SectionDTO {
    id: string;
    name: string;
    questionIds: string[];
}

export interface QuizDTO {
    id: string;
    title: string;
    questions: QuestionDTO[];
    sections: SectionDTO[];
    /** Questions in no section, in quiz question order. */
    unassignedQuestionIds: string[];
    createdAt?: string;
    updatedAt?: string;
}
