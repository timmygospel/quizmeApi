import { IQuizRepository } from "../../../domain/IQuizRepository";
import { Quiz } from "../../../domain/Quiz";

export type SetQuizArchivedOutcome =
    | { ok: true; quiz: Quiz }
    | { ok: false; error: "QUIZ_NOT_FOUND" };

/** Archives or restores a Knowledge Module. Idempotent either way. */
export class SetQuizArchivedUseCase {
    constructor(private quizRepo: IQuizRepository) { }

    async execute(id: string, archived: boolean): Promise<SetQuizArchivedOutcome> {
        const existing = await this.quizRepo.findById(id);
        if (!existing) return { ok: false, error: "QUIZ_NOT_FOUND" };

        await this.quizRepo.setArchived(id, archived);
        const quiz = await this.quizRepo.findById(id);
        return { ok: true, quiz: quiz! };
    }
}
