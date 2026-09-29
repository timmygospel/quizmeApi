import { randomUUID } from "crypto";
import { IQuizRepository } from "../../../domain/IQuizRepository";
import { Quiz, QuizSection } from "../../../domain/Quiz";
import { Question } from "../../../domain/Question";
import { Option } from "../../../domain/Option";
import { QuestionText } from "../../../domain/valueObjects/QuestionText";
import { OptionText } from "../../../domain/valueObjects/OptionText";
import { Result } from "../../../../../shared/core/Result";
import { isUuid } from "../../../../../shared/core/isUuid";
import { QuestionDTO } from "./QuestionDTO";
import { SectionInputDTO } from "./SectionInputDTO";

export interface BuildQuizContentInput {
    /** The quiz being saved — undefined when creating. */
    quizId?: string;
    /** Undefined = keep `existing`'s questions. */
    questions?: QuestionDTO[];
    /** Undefined = keep `existing`'s sections. */
    sections?: SectionInputDTO[];
    existing?: Quiz;
}

export interface QuizContent {
    questions: Question[];
    sections: QuizSection[];
}

/**
 * Resolves the questions and sections for a quiz create/update, enforcing
 * that sections and their questions belong to this quiz only.
 *
 * Assignment comes from one of two places, picked per request:
 *   - Section-driven: if any payload section carries `questionIds`, those
 *     lists are the membership and order (the original payload shape). A
 *     question's `sectionId` is then only checked for cross-quiz use.
 *   - Question-driven: otherwise, each question's `sectionId` (null =
 *     Unassigned) moves it; questions without one keep their current
 *     section. Order within a section follows the questions array.
 *
 * Question and section ids may be client-minted UUIDs, so new questions can
 * be put into new sections in the same save.
 */
export async function buildQuizContent(
    repo: IQuizRepository,
    input: BuildQuizContentInput
): Promise<Result<QuizContent>> {
    // --- Questions ---
    let questions: Question[] = input.existing?.questions ?? [];
    // ids of blank questions dropped from the payload — section lists may still mention them
    const droppedQuestionIds = new Set<string>();
    // payload questions kept, with their resolved id
    const kept: { dto: QuestionDTO; id?: string }[] = [];

    if (input.questions) {
        questions = [];
        const seen = new Set<string>();
        for (const q of input.questions) {
            if (!q.question || q.question.trim().length === 0) {
                if (q.id) droppedQuestionIds.add(q.id);
                continue;
            }
            if (q.id !== undefined && !isUuid(q.id)) return Result.fail(`Question id ${q.id} is not a valid UUID`);
            if (q.id) {
                if (seen.has(q.id)) return Result.fail(`Duplicate question id ${q.id}`);
                seen.add(q.id);
            }

            const textOrError = QuestionText.create(q.question);
            if (textOrError.isFailure) return Result.fail(textOrError.errorValue());

            const options: Option[] = [];
            for (const o of q.options ?? []) {
                if (!o.text || o.text.trim().length === 0) continue;
                const optionTextOrError = OptionText.create(o.text);
                if (optionTextOrError.isFailure) return Result.fail(optionTextOrError.errorValue());
                options.push(new Option({ id: o.id, text: optionTextOrError.getValue(), correct: !!o.correct }));
            }

            // a new question put straight into a section needs its id now, not at persist time
            const id = q.id ?? (q.sectionId ? randomUUID() : undefined);
            kept.push({ dto: q, id });
            questions.push(new Question({ id, question: textOrError.getValue(), options }));
        }
    }
    const questionIds = new Set(questions.map((q) => q.id).filter((id): id is string => !!id));

    // --- Sections (list, names, ids) ---
    let sections: QuizSection[] = input.existing?.sections ?? [];
    if (input.sections) {
        sections = [];
        for (const s of input.sections) {
            if (!s.name || s.name.trim().length === 0) return Result.fail("Section name is required");
            if (s.id !== undefined && !isUuid(s.id)) return Result.fail(`Section id ${s.id} is not a valid UUID`);
            sections.push({ id: s.id, name: s.name.trim(), questionIds: [] });
        }
    }
    const sectionIds = new Set(sections.map((s) => s.id).filter((id): id is string => !!id));

    // --- Cross-quiz ownership ---
    const claimedQuestionIds = [
        ...(input.questions ?? []).map((q) => q.id),
        ...(input.sections ?? []).flatMap((s) => s.questionIds ?? []),
    ].filter((id): id is string => !!id && isUuid(id));
    const claimedSectionIds = [
        ...(input.sections ?? []).map((s) => s.id),
        ...(input.questions ?? []).map((q) => q.sectionId),
    ].filter((id): id is string => !!id && isUuid(id));

    const questionOwners = await repo.findQuestionQuizIds([...new Set(claimedQuestionIds)]);
    const sectionOwners = await repo.findSectionQuizIds([...new Set(claimedSectionIds)]);
    const belongsElsewhere = (owners: Map<string, string>, id: string) =>
        owners.has(id) && owners.get(id) !== input.quizId;

    for (const id of new Set(claimedQuestionIds)) {
        if (belongsElsewhere(questionOwners, id)) return Result.fail(`Question ${id} belongs to another quiz`);
    }
    for (const id of new Set(claimedSectionIds)) {
        if (belongsElsewhere(sectionOwners, id)) return Result.fail(`Section ${id} belongs to another quiz`);
    }

    // --- Membership ---
    const sectionDriven = (input.sections ?? []).some((s) => Array.isArray(s.questionIds));

    if (sectionDriven) {
        input.sections!.forEach((s, i) => {
            sections[i].questionIds = (s.questionIds ?? []).filter((id) => !droppedQuestionIds.has(id));
        });
        for (const section of sections) {
            for (const id of section.questionIds) {
                if (!questionIds.has(id)) return Result.fail(`Question ${id} is not part of this quiz`);
            }
        }
    } else {
        // start from the current assignment of any section that survives the save
        const current = new Map((input.existing?.sections ?? []).filter((s) => s.id).map((s) => [s.id!, s.questionIds]));
        for (const section of sections) {
            section.questionIds = (section.id ? current.get(section.id) ?? [] : []).filter((id) => questionIds.has(id));
        }

        const moves = kept.filter(({ dto }) => dto.sectionId !== undefined);
        for (const { dto, id } of moves) {
            if (dto.sectionId !== null && !sectionIds.has(dto.sectionId!)) {
                return Result.fail(`Section ${dto.sectionId} is not part of this quiz`);
            }
            for (const section of sections) {
                section.questionIds = section.questionIds.filter((qid) => qid !== id);
            }
            if (dto.sectionId && id) sections.find((s) => s.id === dto.sectionId)!.questionIds.push(id);
        }

        if (moves.length > 0) {
            const order = new Map(questions.map((q, i) => [q.id, i]));
            for (const section of sections) {
                section.questionIds.sort((a, b) => order.get(a)! - order.get(b)!);
            }
        }
    }

    const valid = Quiz.validateSections(questions, sections);
    if (valid.isFailure) return Result.fail(valid.errorValue());

    return Result.ok({ questions, sections });
}
