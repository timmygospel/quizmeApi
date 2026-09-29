import { randomUUID } from "crypto";
import { GetSectionQuestionsUseCase } from "./GetSectionQuestionsUseCase";
import { CreateQuizUseCase } from "../createQuiz/CreateQuizUseCase";
import { InMemoryQuizRepository } from "../../../testing/InMemoryQuizRepository";

describe("GetSectionQuestionsUseCase", () => {
    const [q1, q2, q3] = [randomUUID(), randomUUID(), randomUUID()];
    let repo: InMemoryQuizRepository;
    let useCase: GetSectionQuestionsUseCase;

    beforeEach(() => {
        repo = new InMemoryQuizRepository();
        useCase = new GetSectionQuestionsUseCase(repo);
    });

    const createQuiz = async (title: string) =>
        (
            await new CreateQuizUseCase(repo).execute({
                title,
                questions: [{ question: "Q1", options: [] }],
                sections: [{ name: "Product Knowledge" }, { name: "Handling Objections" }],
            })
        ).getValue();

    it("returns the section's questions in section order", async () => {
        const quiz = (
            await new CreateQuizUseCase(repo).execute({
                title: "Sales",
                questions: [
                    { id: q1, question: "Q1", options: [] },
                    { id: q2, question: "Q2", options: [] },
                    { id: q3, question: "Q3", options: [] },
                ],
                sections: [
                    { name: "Product Knowledge", questionIds: [q1] },
                    { name: "Handling Objections", questionIds: [q3, q2] },
                ],
            })
        ).getValue();
        const section = quiz.sections[1];

        const result = await useCase.execute({ quizId: quiz.id!, sectionId: section.id! });

        const value = result.getValue();
        expect(value.section.name).toBe("Handling Objections");
        expect(value.position).toBe(1);
        expect(value.questions.map((q) => q.question.value)).toEqual(["Q3", "Q2"]);
    });

    it("treats another quiz's section as not found", async () => {
        const sales = await createQuiz("Sales");
        const service = await createQuiz("Service");

        const result = await useCase.execute({ quizId: sales.id!, sectionId: service.sections[0].id! });

        expect(result.errorValue()).toMatch(/^NOT_FOUND: Section .* not found in this quiz$/);
    });

    it("reports a missing quiz as not found", async () => {
        const result = await useCase.execute({ quizId: "not-a-uuid", sectionId: randomUUID() });

        expect(result.errorValue()).toMatch(/^NOT_FOUND:/);
    });
});
