import { randomUUID } from "crypto";
import { SetQuizArchivedUseCase } from "./SetQuizArchivedUseCase";
import { CreateQuizUseCase } from "../createQuiz/CreateQuizUseCase";
import { GetAllQuizzesUseCase } from "../getAllQuizzes/GetAllQuizzesUseCase";
import { UpdateQuizUseCase } from "../updateQuiz/UpdateQuizUseCase";
import { InMemoryQuizRepository } from "../../../testing/InMemoryQuizRepository";

describe("SetQuizArchivedUseCase", () => {
    let repo: InMemoryQuizRepository;
    let useCase: SetQuizArchivedUseCase;

    beforeEach(() => {
        repo = new InMemoryQuizRepository();
        useCase = new SetQuizArchivedUseCase(repo);
    });

    const createQuiz = async (title = "Sales") =>
        (await new CreateQuizUseCase(repo).execute({ title, questions: [] })).getValue();
    const listTitles = async (includeArchived?: boolean) =>
        (await new GetAllQuizzesUseCase(repo).execute({ includeArchived })).getValue().map((q) => q.title.value);

    it("hides an archived quiz from the default list but keeps it", async () => {
        const quiz = await createQuiz("Sales");
        await createQuiz("Safety");

        const outcome = await useCase.execute(quiz.id!, true);

        expect(outcome.ok && outcome.quiz.isArchived).toBe(true);
        expect(await listTitles()).toEqual(["Safety"]);
        expect((await listTitles(true)).sort()).toEqual(["Safety", "Sales"]);
    });

    it("restores an archived quiz", async () => {
        const quiz = await createQuiz();
        await useCase.execute(quiz.id!, true);

        const outcome = await useCase.execute(quiz.id!, false);

        expect(outcome.ok && outcome.quiz.isArchived).toBe(false);
        expect(await listTitles()).toEqual(["Sales"]);
    });

    it("keeps a quiz archived when it's edited", async () => {
        const quiz = await createQuiz();
        await useCase.execute(quiz.id!, true);

        await new UpdateQuizUseCase(repo).execute({ id: quiz.id!, title: "Sales v2", questions: [] } as any);

        expect((await repo.findById(quiz.id!))!.isArchived).toBe(true);
    });

    it("reports a missing quiz as not found", async () => {
        expect(await useCase.execute(randomUUID(), true)).toEqual({ ok: false, error: "QUIZ_NOT_FOUND" });
    });
});
