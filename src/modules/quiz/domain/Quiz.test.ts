import { Quiz } from "./Quiz";
import { Question } from "./Question";
import { QuizTitle } from "./valueObjects/QuizTitle";
import { QuestionText } from "./valueObjects/QuestionText";

const question = (id: string) => new Question({ id, question: QuestionText.create(`Question ${id}`).getValue(), options: [] });
const questions = [question("q1"), question("q2"), question("q3")];

describe("Quiz sections", () => {
    it("validates a question sits in at most one section", () => {
        const result = Quiz.validateSections(questions, [
            { id: "s1", name: "A", questionIds: ["q1"] },
            { id: "s2", name: "B", questionIds: ["q1"] },
        ]);

        expect(result.errorValue()).toBe("Question q1 is assigned to more than one section");
    });

    it("validates a section only holds this quiz's questions", () => {
        const result = Quiz.validateSections(questions, [{ id: "s1", name: "A", questionIds: ["elsewhere"] }]);

        expect(result.errorValue()).toBe("Question elsewhere is not part of this quiz");
    });

    it("validates section names and unique ids", () => {
        expect(Quiz.validateSections(questions, [{ name: " ", questionIds: [] }]).isFailure).toBe(true);
        expect(
            Quiz.validateSections(questions, [
                { id: "s1", name: "A", questionIds: [] },
                { id: "s1", name: "B", questionIds: [] },
            ]).errorValue()
        ).toBe("Duplicate section id s1");
    });

    it("derives each question's section and the Unassigned questions", () => {
        const quiz = new Quiz({
            title: QuizTitle.create("Sales Training Day Quiz").getValue(),
            questions,
            sections: [{ id: "s1", name: "A", questionIds: ["q3", "q1"] }],
        });

        expect(quiz.sectionIdOf("q1")).toBe("s1");
        expect(quiz.sectionIdOf("q2")).toBeNull();
        expect(quiz.unassignedQuestionIds).toEqual(["q2"]);
    });
});
