import { randomUUID } from "crypto";
import { DeleteQuizUseCase } from "./DeleteQuizUseCase";
import { CreateQuizUseCase } from "../createQuiz/CreateQuizUseCase";
import { InMemoryQuizRepository } from "../../../testing/InMemoryQuizRepository";

describe("DeleteQuizUseCase", () => {
    let repo: InMemoryQuizRepository;
    let useCase: DeleteQuizUseCase;

    beforeEach(() => {
        repo = new InMemoryQuizRepository();
        useCase = new DeleteQuizUseCase(repo);
    });

    const createQuiz = async () =>
        (await new CreateQuizUseCase(repo).execute({ title: "Sales", questions: [] })).getValue();

    it("deletes a quiz nothing has run", async () => {
        const quiz = await createQuiz();

        expect(await useCase.execute({ id: quiz.id! })).toEqual({ ok: true });
        expect(repo.quizzes.has(quiz.id!)).toBe(false);
    });

    it("refuses to delete a quiz that runs still reference, and says which", async () => {
        const quiz = await createQuiz();
        repo.usage.set(quiz.id!, { assessmentSessions: 1, liveKnowledgeChecks: 2, trainingSessions: 0 });

        const outcome = await useCase.execute({ id: quiz.id! });

        expect(outcome).toEqual({
            ok: false,
            error: "QUIZ_IN_USE",
            message: expect.stringContaining("1 Assessment Session and 2 Live Knowledge Checks"),
        });
        expect(repo.quizzes.has(quiz.id!)).toBe(true);
    });

    it("reports a missing quiz as not found", async () => {
        expect(await useCase.execute({ id: randomUUID() })).toEqual({ ok: false, error: "QUIZ_NOT_FOUND" });
    });
});
