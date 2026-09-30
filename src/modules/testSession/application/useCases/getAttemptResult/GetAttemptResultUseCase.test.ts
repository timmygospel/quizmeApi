import { GetAttemptResultUseCase, toParticipantResult } from "./GetAttemptResultUseCase";
import { AttemptResponse } from "../../../domain/AttemptResponse";
import { Assessment } from "../../../../assessment/domain/Assessment";
import { AssessmentName } from "../../../../assessment/domain/valueObjects/AssessmentName";
import { AssessmentQuestion } from "../../../../assessment/domain/AssessmentQuestion";
import { AssessmentOption } from "../../../../assessment/domain/AssessmentOption";
import { AssessmentQuestionText } from "../../../../assessment/domain/valueObjects/AssessmentQuestionText";
import { AssessmentOptionText } from "../../../../assessment/domain/valueObjects/AssessmentOptionText";
import { ResultVisibility } from "../../../../assessment/domain/ResultVisibility";
import { makeAttempt, makeAttemptRepo, makeParticipant, makeTestSessionRepo } from "../../../testing/fakes";

function assessment(resultVisibility: ResultVisibility): Assessment {
    const q = (id: string, text: string) =>
        new AssessmentQuestion({
            id,
            question: AssessmentQuestionText.create(text).getValue(),
            options: [
                new AssessmentOption({ id: `${id}-a`, text: AssessmentOptionText.create("Right").getValue(), correct: true }),
                new AssessmentOption({ id: `${id}-b`, text: AssessmentOptionText.create("Wrong").getValue(), correct: false }),
            ],
        });
    return new Assessment({
        name: AssessmentName.create("Fire Safety").getValue(),
        description: "", categoryId: null, categoryName: null,
        questionCount: 2, questions: [q("q1", "First?"), q("q2", "Second?")],
        passMark: 50, maxAttempts: 1, durationMinutes: 30, resultVisibility,
        status: "PUBLISHED", createdBy: null, createdByName: null,
    });
}

const submitted = makeAttempt({ status: "SUBMITTED", scorePercentage: 50, passed: true });
const responses = [new AttemptResponse({ testAttemptId: "attempt-1", assessmentQuestionId: "q1", selectedOptionId: "q1-a", isCorrect: true })];

describe("toParticipantResult", () => {
    it("NONE hides the score and pass/fail", () => {
        const r = toParticipantResult(submitted, assessment("NONE"), responses);
        expect(r).toMatchObject({ resultVisibility: "NONE", scorePercentage: null, passed: null, status: "SUBMITTED" });
        expect(r.review).toBeUndefined();
    });

    it("PASS_FAIL shows only whether they passed", () => {
        expect(toParticipantResult(submitted, assessment("PASS_FAIL"), responses)).toMatchObject({ scorePercentage: null, passed: true });
    });

    it("SCORE shows score and pass/fail but no answers", () => {
        const r = toParticipantResult(submitted, assessment("SCORE"), responses);
        expect(r).toMatchObject({ scorePercentage: 50, passed: true });
        expect(r.review).toBeUndefined();
    });

    it("FULL_REVIEW adds every question with their answer and the correct one", () => {
        const r = toParticipantResult(submitted, assessment("FULL_REVIEW"), responses);
        expect(r.scorePercentage).toBe(50);
        expect(r.review).toEqual([
            { id: "q1", question: "First?", selectedOptionId: "q1-a", isCorrect: true,
              options: [{ id: "q1-a", text: "Right", correct: true }, { id: "q1-b", text: "Wrong", correct: false }] },
            { id: "q2", question: "Second?", selectedOptionId: null, isCorrect: false,
              options: [{ id: "q2-a", text: "Right", correct: true }, { id: "q2-b", text: "Wrong", correct: false }] },
        ]);
    });
});

describe("GetAttemptResultUseCase", () => {
    const assessmentRepo = (v: ResultVisibility) => ({ findById: jest.fn().mockResolvedValue(assessment(v)), findAll: jest.fn(), save: jest.fn() });

    it("returns the owner's finished attempt filtered by the assessment's visibility", async () => {
        const attemptRepo = makeAttemptRepo({ findById: jest.fn().mockResolvedValue(submitted), findResponses: jest.fn().mockResolvedValue(responses) });
        const result = await new GetAttemptResultUseCase(attemptRepo, makeTestSessionRepo(), assessmentRepo("FULL_REVIEW")).execute("attempt-1", "user-1");
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().review).toHaveLength(2);
    });

    it("never reveals an attempt that is still in progress (correct answers would leak)", async () => {
        const attemptRepo = makeAttemptRepo({ findById: jest.fn().mockResolvedValue(makeAttempt()) });
        const result = await new GetAttemptResultUseCase(attemptRepo, makeTestSessionRepo(), assessmentRepo("FULL_REVIEW")).execute("attempt-1", "user-1");
        expect(result.errorValue()).toMatch(/^CONFLICT:/);
    });

    it("refuses someone else's attempt", async () => {
        const attemptRepo = makeAttemptRepo({ findById: jest.fn().mockResolvedValue(submitted) });
        const sessionRepo = makeTestSessionRepo({ findParticipantById: jest.fn().mockResolvedValue(makeParticipant("COMPLETED", "someone-else")) });
        const result = await new GetAttemptResultUseCase(attemptRepo, sessionRepo, assessmentRepo("SCORE")).execute("attempt-1", "user-1");
        expect(result.errorValue()).toMatch(/^FORBIDDEN:/);
    });

    it("only loads answers when they will be shown", async () => {
        const attemptRepo = makeAttemptRepo({ findById: jest.fn().mockResolvedValue(submitted) });
        await new GetAttemptResultUseCase(attemptRepo, makeTestSessionRepo(), assessmentRepo("SCORE")).execute("attempt-1", "user-1");
        expect(attemptRepo.findResponses).not.toHaveBeenCalled();
    });
});
