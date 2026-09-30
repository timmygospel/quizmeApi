import { GetQuestionAnalysisUseCase } from "./GetQuestionAnalysisUseCase";
import { makeAssessmentRepo, makeAttemptRepo, makeTestSessionRepo } from "../../../testing/fakes";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

describe("GetQuestionAnalysisUseCase", () => {
    const analysis = { completed: 3, questions: [] };

    it("reports on the session's own assessment", async () => {
        const repo = makeTestSessionRepo({ getQuestionAnalysis: jest.fn().mockResolvedValue(analysis) });
        const session = await repo.findById("ts-1");
        const result = await new GetQuestionAnalysisUseCase(repo, makeAttemptRepo(), makeAssessmentRepo()).execute("ts-1");
        expect(result.getValue()).toBe(analysis);
        expect(repo.getQuestionAnalysis).toHaveBeenCalledWith("ts-1", session!.assessmentId);
    });

    it("finalizes abandoned attempts first, like Results, so both screens count the same people", async () => {
        const order: string[] = [];
        const repo = makeTestSessionRepo({
            expireUnstartedParticipants: jest.fn().mockImplementation(async () => { order.push("finalize"); }),
            getQuestionAnalysis: jest.fn().mockImplementation(async () => { order.push("analyse"); return analysis; }),
        });
        await new GetQuestionAnalysisUseCase(repo, makeAttemptRepo(), makeAssessmentRepo()).execute("ts-1");
        expect(order).toEqual(["finalize", "analyse"]);
    });

    it("a session outside the caller's scope is not found", async () => {
        const repo = makeTestSessionRepo();
        const scope = { type: "SELF", userId: "u9" } as unknown as EffectiveScope; // an ordinary participant
        const result = await new GetQuestionAnalysisUseCase(repo, makeAttemptRepo(), makeAssessmentRepo()).execute("ts-1", scope);
        expect(result.errorValue()).toMatch(/^NOT_FOUND/);
        expect(repo.getQuestionAnalysis).not.toHaveBeenCalled();
    });
});
