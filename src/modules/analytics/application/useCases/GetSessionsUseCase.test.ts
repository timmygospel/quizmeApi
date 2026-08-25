import { GetSessionsUseCase } from "./GetSessionsUseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

function makeRepo(overrides: Partial<IAnalyticsRepository> = {}): IAnalyticsRepository {
    return {
        getTrainingTemplates: jest.fn(),
        getSessions: jest.fn().mockResolvedValue([]),
        getSessionSummary: jest.fn(),
        getSessionAlerts: jest.fn(),
        getTopProblems: jest.fn(),
        compareByDepartment: jest.fn(),
        compareByLocation: jest.fn(),
        getTrends: jest.fn(),
        ...overrides,
    };
}

describe("GetSessionsUseCase", () => {
    it("passes the training template filter and the caller's effective scope through", async () => {
        const repo = makeRepo();
        const useCase = new GetSessionsUseCase(repo);
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        await useCase.execute("template-1", scope);

        expect(repo.getSessions).toHaveBeenCalledWith("template-1", scope);
    });
});
