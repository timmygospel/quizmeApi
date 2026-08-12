import { QuestionBankMap } from "./QuestionBankMap";

describe("QuestionBankMap.toDomain", () => {
    it("orders options by display_order and preserves correctness", () => {
        const question = QuestionBankMap.toDomain({
            question: {
                id: "qb-1",
                question_text: "What is the capital of France?",
                category_id: "cat-1",
                created_at: new Date(),
                updated_at: new Date(),
            },
            options: [
                { id: "o2", question_id: "qb-1", text: "London", is_correct: false, display_order: 1 },
                { id: "o1", question_id: "qb-1", text: "Paris", is_correct: true, display_order: 0 },
            ],
        });

        expect(question.id).toBe("qb-1");
        expect(question.categoryId).toBe("cat-1");
        expect(question.options.map((o) => o.text)).toEqual(["Paris", "London"]);
        expect(question.options[0].correct).toBe(true);
    });

    it("throws when no option is marked correct (domain invariant)", () => {
        expect(() =>
            QuestionBankMap.toDomain({
                question: {
                    id: "qb-2",
                    question_text: "Broken question",
                    category_id: null,
                    created_at: new Date(),
                    updated_at: new Date(),
                },
                options: [
                    { id: "o1", question_id: "qb-2", text: "A", is_correct: false, display_order: 0 },
                    { id: "o2", question_id: "qb-2", text: "B", is_correct: false, display_order: 1 },
                ],
            })
        ).toThrow("Exactly one option must be marked correct");
    });
});
