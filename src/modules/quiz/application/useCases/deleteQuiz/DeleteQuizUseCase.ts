import { IQuizRepository, QuizUsage } from "../../../domain/IQuizRepository";
import { DeleteQuizDTO } from "./DeleteQuizDTO";

export type DeleteQuizOutcome =
    | { ok: true }
    | { ok: false; error: "QUIZ_NOT_FOUND" }
    | { ok: false; error: "QUIZ_IN_USE"; message: string };

/**
 * A Knowledge Module that has been run (Assessment Session, Live Knowledge
 * Check, Training Session) can't be deleted: those records keep their results
 * against it, and deleting would either fail the FK or wipe that history.
 */
export class DeleteQuizUseCase {
    constructor(private quizRepo: IQuizRepository) { }

    async execute(dto: DeleteQuizDTO): Promise<DeleteQuizOutcome> {
        const existing = await this.quizRepo.findById(dto.id);
        if (!existing) return { ok: false, error: "QUIZ_NOT_FOUND" };

        const usage = await this.quizRepo.findUsage(dto.id);
        const usedBy = describeUsage(usage);
        if (usedBy.length > 0) {
            return {
                ok: false,
                error: "QUIZ_IN_USE",
                message: `This Knowledge Module can't be deleted because it's used by ${joinList(usedBy)}. Their results depend on it.`,
            };
        }

        await this.quizRepo.delete(dto.id);
        return { ok: true };
    }
}

function describeUsage(usage: QuizUsage): string[] {
    const parts: string[] = [];
    const add = (n: number, one: string, many: string) => {
        if (n > 0) parts.push(`${n} ${n === 1 ? one : many}`);
    };
    add(usage.assessmentSessions, "Assessment Session", "Assessment Sessions");
    add(usage.liveKnowledgeChecks, "Live Knowledge Check", "Live Knowledge Checks");
    add(usage.trainingSessions, "Training Session", "Training Sessions");
    return parts;
}

function joinList(items: string[]): string {
    if (items.length <= 1) return items.join("");
    return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
