import { GetTrainingTemplatesUseCase } from "./GetTrainingTemplatesUseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

function makeRepo(overrides: Partial<IAnalyticsRepository> = {}): IAnalyticsRepository {
    return {
        getTrainingTemplates: jest.fn().mockResolvedValue([]),
        getSessions: jest.fn(),
        getSessionSummary: jest.fn(),
        getSessionAlerts: jest.fn(),
        getTopProblems: jest.fn(),
        compareByDepartment: jest.fn(),
        compareByLocation: jest.fn(),
        getTrends: jest.fn(),
        ...overrides,
    };
}

describe("GetTrainingTemplatesUseCase", () => {
    it("passes the caller's effective scope through to the repository", async () => {
        const repo = makeRepo();
        const useCase = new GetTrainingTemplatesUseCase(repo);
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        await useCase.execute(scope);

        expect(repo.getTrainingTemplates).toHaveBeenCalledWith(scope);
    });
});
