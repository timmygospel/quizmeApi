import { Assessment } from "../domain/Assessment";
import { AssessmentName } from "../domain/valueObjects/AssessmentName";
import { AssessmentStatus, isAssessmentStatus } from "../domain/AssessmentStatus";
import { AssessmentQuestion } from "../domain/AssessmentQuestion";
import { AssessmentQuestionText } from "../domain/valueObjects/AssessmentQuestionText";
import { AssessmentOption } from "../domain/AssessmentOption";
import { AssessmentOptionText } from "../domain/valueObjects/AssessmentOptionText";
import { AssessmentDTO, AssessmentDetailDTO } from "../dtos/AssessmentDTO";

// Row shape produced by PgAssessmentRepository's join against
// categories/users — see that file for the SELECT.
export interface AssessmentRow {
    id: string;
    name: string;
    description: string;
    category_id: string | null;
    category_name: string | null;
    question_count: number;
    pass_mark: number;
    max_attempts: number | null;
    duration_minutes: number | null;
    status: string;
    created_by: string | null;
    created_by_name: string | null;
    created_at: Date;
    updated_at: Date;
}

export interface AssessmentQuestionRow {
    id: string;
    assessment_id: string;
    question_text: string;
    display_order: number;
}

export interface AssessmentOptionRow {
    id: string;
    question_id: string;
    text: string;
    is_correct: boolean;
    display_order: number;
}

export class AssessmentMap {
    public static toDomain(row: AssessmentRow): Assessment {
        const nameOrError = AssessmentName.create(row.name);
        if (nameOrError.isFailure) throw new Error(nameOrError.errorValue());

        const status: AssessmentStatus = isAssessmentStatus(row.status) ? row.status : "DRAFT";

        return new Assessment({
            id: row.id,
            name: nameOrError.getValue(),
            description: row.description,
            categoryId: row.category_id,
            categoryName: row.category_name,
            questionCount: row.question_count,
            passMark: row.pass_mark,
            maxAttempts: row.max_attempts,
            durationMinutes: row.duration_minutes,
            status,
            createdBy: row.created_by,
            createdByName: row.created_by_name,
            createdAt: row.created_at,
            updatedAt: row.updated_at,
        });
    }

    // Detail load — assessment row plus its questions/options, queried
    // separately by PgAssessmentRepository.findById (mirrors QuizMap's
    // toDomain(QuizRows)).
    public static toDomainWithQuestions(
        row: AssessmentRow,
        questionRows: AssessmentQuestionRow[],
        optionRows: AssessmentOptionRow[]
    ): Assessment {
        const base = AssessmentMap.toDomain(row);

        const optionsByQuestion = new Map<string, AssessmentOptionRow[]>();
        for (const o of optionRows) {
            const list = optionsByQuestion.get(o.question_id) ?? [];
            list.push(o);
            optionsByQuestion.set(o.question_id, list);
        }

        const questions = questionRows.map((q) => {
            const questionTextOrError = AssessmentQuestionText.create(q.question_text);
            if (questionTextOrError.isFailure) throw new Error(questionTextOrError.errorValue());

            const options = (optionsByQuestion.get(q.id) ?? []).map((o) => {
                const optionTextOrError = AssessmentOptionText.create(o.text);
                if (optionTextOrError.isFailure) throw new Error(optionTextOrError.errorValue());
                return new AssessmentOption({ id: o.id, text: optionTextOrError.getValue(), correct: o.is_correct });
            });

            return new AssessmentQuestion({ id: q.id, question: questionTextOrError.getValue(), options });
        });

        return new Assessment({ ...base, questions, questionCount: questions.length });
    }

    public static toDTO(assessment: Assessment): AssessmentDTO {
        return {
            id: assessment.id!,
            name: assessment.name.value,
            description: assessment.description,
            categoryId: assessment.categoryId,
            categoryName: assessment.categoryName,
            questionCount: assessment.questionCount,
            passMark: assessment.passMark,
            maxAttempts: assessment.maxAttempts,
            durationMinutes: assessment.durationMinutes,
            status: assessment.status,
            createdBy: assessment.createdBy,
            createdByName: assessment.createdByName,
            createdAt: assessment.createdAt.toISOString(),
            updatedAt: assessment.updatedAt.toISOString(),
        };
    }

    public static toDetailDTO(assessment: Assessment): AssessmentDetailDTO {
        return {
            ...AssessmentMap.toDTO(assessment),
            questions: (assessment.questions ?? []).map((q) => ({
                id: q.id,
                question: q.question.value,
                options: q.options.map((o) => ({ id: o.id, text: o.text.value, correct: o.correct })),
            })),
        };
    }
}
