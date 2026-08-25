import { GetTrendsUseCase } from "./GetTrendsUseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

function makeRepo(overrides: Partial<IAnalyticsRepository> = {}): IAnalyticsRepository {
    return {
        getTrainingTemplates: jest.fn(),
        getSessions: jest.fn(),
        getSessionSummary: jest.fn(),
        getSessionAlerts: jest.fn(),
        getTopProblems: jest.fn(),
        compareByDepartment: jest.fn(),
        compareByLocation: jest.fn(),
        getTrends: jest.fn().mockResolvedValue({ trends: [] }),
        ...overrides,
    };
}

describe("GetTrendsUseCase", () => {
    it("passes the caller's effective scope through to the repository", async () => {
        const repo = makeRepo();
        const useCase = new GetTrendsUseCase(repo);
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        await useCase.execute("template-1", scope);

        expect(repo.getTrends).toHaveBeenCalledWith("template-1", scope);
    });
});
