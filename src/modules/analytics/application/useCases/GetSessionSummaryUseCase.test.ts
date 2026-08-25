import { GetSessionSummaryUseCase } from "./GetSessionSummaryUseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

function makeRepo(overrides: Partial<IAnalyticsRepository> = {}): IAnalyticsRepository {
    return {
        getTrainingTemplates: jest.fn(),
        getSessions: jest.fn(),
        getSessionSummary: jest.fn().mockResolvedValue(null),
        getSessionAlerts: jest.fn(),
        getTopProblems: jest.fn(),
        compareByDepartment: jest.fn(),
        compareByLocation: jest.fn(),
        getTrends: jest.fn(),
        ...overrides,
    };
}

describe("GetSessionSummaryUseCase", () => {
    it("passes the caller's effective scope through to the repository", async () => {
        const repo = makeRepo();
        const useCase = new GetSessionSummaryUseCase(repo);
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        await useCase.execute("session-1", scope);

        expect(repo.getSessionSummary).toHaveBeenCalledWith("session-1", scope);
    });
});
