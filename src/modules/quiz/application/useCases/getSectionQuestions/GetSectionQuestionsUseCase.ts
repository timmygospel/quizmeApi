import { IQuizRepository } from "../../../domain/IQuizRepository";
import { QuizSection } from "../../../domain/Quiz";
import { Question } from "../../../domain/Question";
import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";
import { isUuid } from "../../../../../shared/core/isUuid";

export interface GetSectionQuestionsDTO {
    quizId: string;
    sectionId: string;
}

export interface SectionQuestions {
    quizId: string;
    section: QuizSection;
    position: number;
    /** The section's questions, in section order. */
    questions: Question[];
}

/**
 * The questions in one section of a quiz — used to pick the questions for a
 * knowledge check at the matching point of a training course. A section id
 * from another quiz is treated as not found.
 */
export class GetSectionQuestionsUseCase implements UseCase<GetSectionQuestionsDTO, Promise<Result<SectionQuestions>>> {
    constructor(private quizRepo: IQuizRepository) { }

    async execute(dto: GetSectionQuestionsDTO): Promise<Result<SectionQuestions>> {
        if (!isUuid(dto.quizId)) return Result.fail(`NOT_FOUND: Quiz with id ${dto.quizId} not found`);
        const quiz = await this.quizRepo.findById(dto.quizId);
        if (!quiz) return Result.fail(`NOT_FOUND: Quiz with id ${dto.quizId} not found`);

        const position = quiz.sections.findIndex((s) => s.id === dto.sectionId);
        if (position === -1) return Result.fail(`NOT_FOUND: Section ${dto.sectionId} not found in this quiz`);
        const section = quiz.sections[position];

        const byId = new Map(quiz.questions.map((q) => [q.id, q]));
        const questions = section.questionIds.map((id) => byId.get(id)).filter((q): q is Question => !!q);

        return Result.ok({ quizId: quiz.id!, section, position, questions });
    }
}
