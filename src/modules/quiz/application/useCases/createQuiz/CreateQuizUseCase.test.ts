import { randomUUID } from "crypto";
import { CreateQuizUseCase } from "./CreateQuizUseCase";
import { InMemoryQuizRepository } from "../../../testing/InMemoryQuizRepository";

const opts = [
    { text: "Yes", correct: true },
    { text: "No", correct: false },
];

describe("CreateQuizUseCase — sections", () => {
    let repo: InMemoryQuizRepository;
    let create: CreateQuizUseCase;

    beforeEach(() => {
        repo = new InMemoryQuizRepository();
        create = new CreateQuizUseCase(repo);
    });

    it("keeps client question ids so assignments made before the first save survive", async () => {
        const [q1, q2] = [randomUUID(), randomUUID()];

        const result = await create.execute({
            title: "Sales Training Day Quiz",
            questions: [
                { id: q1, question: "What is our standard warranty?", options: opts },
                { id: q2, question: "How do you handle price objections?", options: opts },
            ],
            sections: [{ name: "Handling Objections", questionIds: [q2] }],
        });

        const quiz = result.getValue();
        expect(quiz.questions.map((q) => q.id)).toEqual([q1, q2]);
        expect(quiz.sections).toEqual([{ id: expect.any(String), name: "Handling Objections", questionIds: [q2] }]);
        expect(quiz.unassignedQuestionIds).toEqual([q1]);
    });

    it("accepts per-question sectionIds that point at client-minted section ids", async () => {
        const sectionId = randomUUID();

        const result = await create.execute({
            title: "Sales Training Day Quiz",
            questions: [{ question: "When do you ask for the sale?", options: opts, sectionId }],
            sections: [{ id: sectionId, name: "Closing the Sale" }],
        });

        const quiz = result.getValue();
        expect(quiz.sections[0].id).toBe(sectionId);
        expect(quiz.sections[0].questionIds).toEqual([quiz.questions[0].id]);
    });

    it("rejects a question id or section id that already belongs to another Knowledge Module", async () => {
        const existing = (
            await create.execute({
                title: "Customer Service Quiz",
                questions: [{ id: randomUUID(), question: "How do you log a complaint?", options: opts }],
                sections: [{ id: randomUUID(), name: "Complaint Handling" }],
            })
        ).getValue();

        const takenQuestion = await create.execute({
            title: "Copy",
            questions: [{ id: existing.questions[0].id, question: "Copied", options: opts }],
        });
        const takenSection = await create.execute({
            title: "Copy",
            sections: [{ id: existing.sections[0].id, name: "Complaint Handling" }],
        });

        expect(takenQuestion.errorValue()).toBe(`Question ${existing.questions[0].id} belongs to another Knowledge Module`);
        expect(takenSection.errorValue()).toBe(`Section ${existing.sections[0].id} belongs to another Knowledge Module`);
        expect(repo.quizzes.size).toBe(1);
    });

    it("creates a quiz with no sections as all-Unassigned", async () => {
        const result = await create.execute({ title: "Plain", questions: [{ question: "Q?", options: opts }] });

        const quiz = result.getValue();
        expect(quiz.sections).toEqual([]);
        expect(quiz.unassignedQuestionIds).toEqual([quiz.questions[0].id]);
    });
});
