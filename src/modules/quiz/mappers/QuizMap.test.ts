import { QuizMap, QuizRows } from "./QuizMap";

describe("QuizMap.toDomain", () => {
    const baseRows: QuizRows = {
        quiz: {
            id: "quiz-1",
            title: "Fire Safety",
            created_at: new Date("2026-01-01T00:00:00Z"),
            updated_at: new Date("2026-01-02T00:00:00Z"),
        },
        questions: [
            { id: "q1", quiz_id: "quiz-1", question_text: "What do you do first?", display_order: 0 },
            { id: "q2", quiz_id: "quiz-1", question_text: "Where is the exit?", display_order: 1 },
        ],
        options: [
            { id: "o1", question_id: "q1", text: "Call for help", is_correct: true, display_order: 0 },
            { id: "o2", question_id: "q1", text: "Panic", is_correct: false, display_order: 1 },
            { id: "o3", question_id: "q2", text: "North exit", is_correct: true, display_order: 0 },
        ],
        sections: [{ id: "s1", quiz_id: "quiz-1", name: "Basics", display_order: 0 }],
        sectionQuestions: [{ section_id: "s1", question_id: "q1" }],
    };

    it("reassembles questions in display order with their options", () => {
        const quiz = QuizMap.toDomain(baseRows);

        expect(quiz.id).toBe("quiz-1");
        expect(quiz.title.value).toBe("Fire Safety");
        expect(quiz.questions).toHaveLength(2);
        expect(quiz.questions[0].question.value).toBe("What do you do first?");
        expect(quiz.questions[0].options.map((o) => o.text.value)).toEqual(["Call for help", "Panic"]);
        expect(quiz.questions[0].options[0].correct).toBe(true);
    });

    it("attaches a section's questionIds from the join rows", () => {
        const quiz = QuizMap.toDomain(baseRows);

        expect(quiz.sections).toHaveLength(1);
        expect(quiz.sections[0].name).toBe("Basics");
        expect(quiz.sections[0].questionIds).toEqual(["q1"]);
    });

    it("round-trips through toDTO with matching ids and correctness flags", () => {
        const quiz = QuizMap.toDomain(baseRows);
        const dto = QuizMap.toDTO(quiz);

        expect(dto.id).toBe("quiz-1");
        expect(dto.questions).toHaveLength(2);
        expect(dto.questions[1].options[0].correct).toBe(true);
        expect(dto.sections[0].questionIds).toEqual(["q1"]);
    });
});
