import { GetActivityUseCase } from "./GetActivityUseCase";
import { GetAnalyticsBreakdownUseCase } from "../getAnalyticsBreakdown/GetAnalyticsBreakdownUseCase";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { makeAttemptRepo, makeAssessmentRepo, makeSession, makeTestSessionRepo } from "../../../testing/fakes";

const entry = { id: "e1", eventType: "ATTEMPT_SUBMITTED", occurredAt: new Date("2026-09-30T10:00:00Z"), actorName: "Jo Taker", attemptNumber: 1 };

describe("GetActivityUseCase", () => {
    it("returns the session's audit trail, newest first as the repository gives it", async () => {
        const repo = makeTestSessionRepo({ getActivity: jest.fn().mockResolvedValue([entry]) });
        const result = await new GetActivityUseCase(repo).execute("session-1");

        expect(result.getValue()).toEqual([
            { id: "e1", eventType: "ATTEMPT_SUBMITTED", occurredAt: "2026-09-30T10:00:00.000Z", actorName: "Jo Taker", attemptNumber: 1 },
        ]);
    });

    it("hides sessions outside the caller's scope", async () => {
        const repo = makeTestSessionRepo({
            findById: jest.fn().mockResolvedValue(makeSession({ audience: [{ locationId: "london", departmentId: "finance" }] })),
            getActivity: jest.fn(),
        });
        const scope = { type: "SCOPED", userId: "trainer-1", locationIds: ["birmingham"], departmentIds: [], allLocations: false } as unknown as EffectiveScope;

        const result = await new GetActivityUseCase(repo).execute("session-1", scope);

        expect(result.errorValue()).toMatch(/^NOT_FOUND/);
        expect(repo.getActivity).not.toHaveBeenCalled();
    });
});

describe("GetAnalyticsBreakdownUseCase — drill-down", () => {
    it("passes the location through, so a location can be broken down by department", async () => {
        const repo = makeTestSessionRepo({
            getResults: jest.fn().mockResolvedValue({}),
            getQuestionAnalysis: jest.fn(),
            getAnalyticsBreakdown: jest.fn().mockResolvedValue([{ id: "d1", name: "Sales", assigned: 3, completed: 2, averageScore: 80, passRate: 100 }]),
        });
        const result = await new GetAnalyticsBreakdownUseCase(repo, makeAttemptRepo(), makeAssessmentRepo())
            .execute("session-1", "department", undefined, "loc-1");

        expect(repo.getAnalyticsBreakdown).toHaveBeenCalledWith("session-1", "department", "loc-1");
        expect(result.getValue()).toMatchObject({ groupBy: "department", locationId: "loc-1", groups: [{ id: "d1", name: "Sales" }] });
    });
});
