import { IQuizRepository } from "../../../domain/IQuizRepository";
import { Quiz } from "../../../domain/Quiz";

export class GetQuizUseCase {
    constructor(private quizRepo: IQuizRepository) { }

    async execute(id: string): Promise<Quiz> {
        const quiz = await this.quizRepo.findById(id);
        if (!quiz) {
            throw new Error("Quiz not found");
        }
        return quiz;
    }
}
