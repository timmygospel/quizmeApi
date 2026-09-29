import { randomUUID } from "crypto";
import { UpdateQuizUseCase } from "./UpdateQuizUseCase";
import { CreateQuizUseCase } from "../createQuiz/CreateQuizUseCase";
import { InMemoryQuizRepository } from "../../../testing/InMemoryQuizRepository";
import { Quiz } from "../../../domain/Quiz";
import { QuizMap } from "../../../mappers/QuizMap";
import { QuestionDTO } from "../shared/QuestionDTO";

const q = (id: string, text: string, sectionId?: string | null): QuestionDTO => ({
    id,
    question: text,
    options: [
        { text: "Yes", correct: true },
        { text: "No", correct: false },
    ],
    ...(sectionId !== undefined ? { sectionId } : {}),
});

const names = (quiz: Quiz) => quiz.sections.map((s) => s.name);
const members = (quiz: Quiz, name: string) => quiz.sections.find((s) => s.name === name)!.questionIds;

describe("UpdateQuizUseCase — sections", () => {
    let repo: InMemoryQuizRepository;
    let update: UpdateQuizUseCase;
    let quiz: Quiz;
    const [q1, q2, q3] = [randomUUID(), randomUUID(), randomUUID()];

    beforeEach(async () => {
        repo = new InMemoryQuizRepository();
        update = new UpdateQuizUseCase(repo);
        const created = await new CreateQuizUseCase(repo).execute({
            title: "Sales Training Day Quiz",
            questions: [q(q1, "What is our standard warranty?"), q(q2, "How do you handle price objections?"), q(q3, "When do you ask for the sale?")],
        });
        quiz = created.getValue();
    });

    it("creates sections that belong to the quiz, with every question Unassigned by default", async () => {
        const result = await update.execute({
            id: quiz.id!,
            sections: [{ name: "Product Knowledge" }, { name: "Handling Objections" }, { name: "Closing the Sale" }],
        });

        expect(result.isSuccess).toBe(true);
        const saved = result.getValue();
        expect(names(saved)).toEqual(["Product Knowledge", "Handling Objections", "Closing the Sale"]);
        expect(saved.sections.every((s) => s.id && s.questionIds.length === 0)).toBe(true);
        expect(saved.unassignedQuestionIds).toEqual([q1, q2, q3]);
        expect((await repo.findSectionQuizIds(saved.sections.map((s) => s.id!))).size).toBe(3);
    });

    it("rejects a blank section name", async () => {
        const result = await update.execute({ id: quiz.id!, sections: [{ name: "  " }] });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("Section name is required");
    });

    it("renames a section, keeping its id and questions", async () => {
        const first = (await update.execute({ id: quiz.id!, sections: [{ name: "Product", questionIds: [q1] }] })).getValue();
        const sectionId = first.sections[0].id!;

        const renamed = (await update.execute({ id: quiz.id!, sections: [{ id: sectionId, name: "Product Knowledge" }] })).getValue();

        expect(renamed.sections).toEqual([{ id: sectionId, name: "Product Knowledge", questionIds: [q1] }]);
    });

    it("deleting a section leaves its questions in the quiz, Unassigned", async () => {
        const withSections = (
            await update.execute({
                id: quiz.id!,
                sections: [
                    { name: "Product Knowledge", questionIds: [q1, q2] },
                    { name: "Closing the Sale", questionIds: [q3] },
                ],
            })
        ).getValue();
        const keep = withSections.sections[1];

        const result = await update.execute({ id: quiz.id!, sections: [{ id: keep.id, name: keep.name, questionIds: [q3] }] });

        const saved = result.getValue();
        expect(names(saved)).toEqual(["Closing the Sale"]);
        expect(saved.questions.map((x) => x.id)).toEqual([q1, q2, q3]);
        expect(saved.unassignedQuestionIds).toEqual([q1, q2]);
    });

    describe("section-driven payload (sections carry questionIds — the original shape)", () => {
        it("assigns questions, keeps the given order within each section, and the section order", async () => {
            const result = await update.execute({
                id: quiz.id!,
                sections: [
                    { name: "Handling Objections", questionIds: [q3, q2] },
                    { name: "Product Knowledge", questionIds: [q1] },
                ],
            });

            const saved = result.getValue();
            expect(names(saved)).toEqual(["Handling Objections", "Product Knowledge"]);
            expect(members(saved, "Handling Objections")).toEqual([q3, q2]);
            expect(saved.unassignedQuestionIds).toEqual([]);
        });

        it("moves a question: it no longer belongs to its previous section", async () => {
            const first = (
                await update.execute({
                    id: quiz.id!,
                    sections: [{ name: "Product Knowledge", questionIds: [q1, q2] }, { name: "Handling Objections", questionIds: [] }],
                })
            ).getValue();
            const [pk, ho] = first.sections;

            const moved = (
                await update.execute({
                    id: quiz.id!,
                    sections: [
                        { id: pk.id, name: pk.name, questionIds: [q2] },
                        { id: ho.id, name: ho.name, questionIds: [q1] },
                    ],
                })
            ).getValue();

            expect(members(moved, "Product Knowledge")).toEqual([q2]);
            expect(members(moved, "Handling Objections")).toEqual([q1]);
        });

        it("ignores a question's echoed sectionId from a prior load, so a move to Unassigned sticks", async () => {
            const first = (await update.execute({ id: quiz.id!, sections: [{ name: "Product Knowledge", questionIds: [q1] }] })).getValue();
            const loaded = QuizMap.toDTO(first); // q1 now carries sectionId = Product Knowledge
            const pk = loaded.sections[0];

            const result = await update.execute({
                id: quiz.id!,
                questions: loaded.questions.map((x) => ({ ...x, id: x.id! })),
                sections: [{ id: pk.id, name: pk.name, questionIds: [] }],
            });

            expect(result.getValue().unassignedQuestionIds).toEqual([q1, q2, q3]);
        });

        it("rejects a question listed in two sections", async () => {
            const result = await update.execute({
                id: quiz.id!,
                sections: [{ name: "A", questionIds: [q1] }, { name: "B", questionIds: [q1] }],
            });

            expect(result.isFailure).toBe(true);
            expect(result.errorValue()).toContain("more than one section");
        });

        it("rejects an unknown question id instead of silently dropping it", async () => {
            const stray = randomUUID();
            const result = await update.execute({ id: quiz.id!, sections: [{ name: "A", questionIds: [stray] }] });

            expect(result.isFailure).toBe(true);
            expect(result.errorValue()).toBe(`Question ${stray} is not part of this quiz`);
        });

        it("drops a blank (discarded) question from its section without failing the save", async () => {
            const blank = randomUUID();
            const result = await update.execute({
                id: quiz.id!,
                questions: [q(q1, "What is our standard warranty?"), { id: blank, question: "", options: [] }],
                sections: [{ name: "A", questionIds: [q1, blank] }],
            });

            expect(result.isSuccess).toBe(true);
            expect(members(result.getValue(), "A")).toEqual([q1]);
        });
    });

    describe("question-driven payload (questions carry sectionId)", () => {
        it("assigns a brand-new question to a brand-new section in the same save", async () => {
            const sectionId = randomUUID();
            const fresh = randomUUID();

            const result = await update.execute({
                id: quiz.id!,
                questions: [q(q1, "What is our standard warranty?"), q(fresh, "Which objection is most common?", sectionId)],
                sections: [{ id: sectionId, name: "Handling Objections" }],
            });

            const saved = result.getValue();
            expect(saved.sections).toEqual([{ id: sectionId, name: "Handling Objections", questionIds: [fresh] }]);
            expect(saved.unassignedQuestionIds).toEqual([q1]);
        });

        it("mints an id for a new question sent with a sectionId but no id", async () => {
            const sectionId = randomUUID();

            const result = await update.execute({
                id: quiz.id!,
                questions: [{ question: "Brand new?", options: [], sectionId }],
                sections: [{ id: sectionId, name: "Product Knowledge" }],
            });

            const saved = result.getValue();
            expect(saved.sections[0].questionIds).toEqual([saved.questions[0].id]);
        });

        it("moves a question between sections, and null unassigns it", async () => {
            const [pk, ho] = [randomUUID(), randomUUID()];
            await update.execute({
                id: quiz.id!,
                questions: [q(q1, "Q1", pk), q(q2, "Q2", pk), q(q3, "Q3")],
                sections: [{ id: pk, name: "Product Knowledge" }, { id: ho, name: "Handling Objections" }],
            });

            const moved = (
                await update.execute({ id: quiz.id!, questions: [q(q1, "Q1", ho), q(q2, "Q2", null), q(q3, "Q3")] })
            ).getValue();

            expect(members(moved, "Product Knowledge")).toEqual([]);
            expect(members(moved, "Handling Objections")).toEqual([q1]);
            expect(moved.unassignedQuestionIds).toEqual([q2, q3]);
        });

        it("keeps current assignments for questions that don't specify a sectionId", async () => {
            await update.execute({ id: quiz.id!, sections: [{ name: "Product Knowledge", questionIds: [q1] }] });

            const saved = (await update.execute({ id: quiz.id!, title: "Renamed", questions: [q(q1, "Q1"), q(q2, "Q2")] })).getValue();

            expect(members(saved, "Product Knowledge")).toEqual([q1]);
        });

        it("orders questions within a section by the questions array", async () => {
            const pk = randomUUID();
            const result = await update.execute({
                id: quiz.id!,
                questions: [q(q3, "Q3", pk), q(q1, "Q1", pk), q(q2, "Q2")],
                sections: [{ id: pk, name: "Product Knowledge" }],
            });

            expect(members(result.getValue(), "Product Knowledge")).toEqual([q3, q1]);
        });

        it("rejects a sectionId that isn't one of this quiz's sections", async () => {
            const unknown = randomUUID();
            const result = await update.execute({ id: quiz.id!, questions: [q(q1, "Q1", unknown)] });

            expect(result.isFailure).toBe(true);
            expect(result.errorValue()).toBe(`Section ${unknown} is not part of this quiz`);
        });
    });

    describe("cross-quiz assignment", () => {
        let otherQuiz: Quiz;

        beforeEach(async () => {
            otherQuiz = (
                await new CreateQuizUseCase(repo).execute({
                    title: "Customer Service Quiz",
                    questions: [q(randomUUID(), "How do you log a complaint?")],
                    sections: [{ name: "Complaint Handling" }, { name: "Customer Communication" }],
                })
            ).getValue();
        });

        it("rejects assigning a question to another quiz's section and leaves the question unchanged", async () => {
            const foreign = otherQuiz.sections[0].id!;

            const result = await update.execute({ id: quiz.id!, questions: [q(q1, "Q1", foreign), q(q2, "Q2"), q(q3, "Q3")] });

            expect(result.isFailure).toBe(true);
            expect(result.errorValue()).toBe(`Section ${foreign} belongs to another quiz`);
            const stored = (await repo.findById(quiz.id!))!;
            expect(stored.questions.map((x) => x.id)).toEqual([q1, q2, q3]);
            expect(stored.sections).toEqual([]);
            expect((await repo.findById(otherQuiz.id!))!.sections.every((s) => s.questionIds.length === 0)).toBe(true);
        });

        it("rejects the cross-quiz sectionId even when sections drive membership", async () => {
            const foreign = otherQuiz.sections[1].id!;

            const result = await update.execute({
                id: quiz.id!,
                questions: [q(q1, "Q1", foreign)],
                sections: [{ name: "Product Knowledge", questionIds: [q1] }],
            });

            expect(result.errorValue()).toBe(`Section ${foreign} belongs to another quiz`);
        });

        it("rejects re-using another quiz's section id for a section of this quiz", async () => {
            const foreign = otherQuiz.sections[0].id!;

            const result = await update.execute({ id: quiz.id!, sections: [{ id: foreign, name: "Complaint Handling" }] });

            expect(result.errorValue()).toBe(`Section ${foreign} belongs to another quiz`);
        });

        it("rejects putting another quiz's question in a section of this quiz", async () => {
            const foreignQuestion = otherQuiz.questions[0].id!;

            const result = await update.execute({ id: quiz.id!, sections: [{ name: "A", questionIds: [foreignQuestion] }] });

            expect(result.errorValue()).toBe(`Question ${foreignQuestion} belongs to another quiz`);
        });
    });

    it("rejects a non-UUID section id", async () => {
        const result = await update.execute({ id: quiz.id!, sections: [{ id: "local-1", name: "A" }] });

        expect(result.errorValue()).toBe("Section id local-1 is not a valid UUID");
    });

    it("tags a missing quiz as NOT_FOUND", async () => {
        const result = await update.execute({ id: randomUUID(), title: "x" });

        expect(result.errorValue()).toMatch(/^NOT_FOUND:/);
    });
});
