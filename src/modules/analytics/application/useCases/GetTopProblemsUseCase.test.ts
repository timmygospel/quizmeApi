import { GetTopProblemsUseCase } from "./GetTopProblemsUseCase";
import { IAnalyticsRepository } from "../../domain/IAnalyticsRepository";
import { EffectiveScope } from "../../../../shared/core/EffectiveScope";

function makeRepo(overrides: Partial<IAnalyticsRepository> = {}): IAnalyticsRepository {
    return {
        getTrainingTemplates: jest.fn(),
        getSessions: jest.fn(),
        getSessionSummary: jest.fn(),
        getSessionAlerts: jest.fn(),
        getTopProblems: jest
            .fn()
            .mockResolvedValue({ at_risk_users: [], weak_sections: [], hardest_questions: [] }),
        compareByDepartment: jest.fn(),
        compareByLocation: jest.fn(),
        getTrends: jest.fn(),
        ...overrides,
    };
}

describe("GetTopProblemsUseCase", () => {
    it("passes the caller's effective scope through to the repository", async () => {
        const repo = makeRepo();
        const useCase = new GetTopProblemsUseCase(repo);
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        await useCase.execute("session-1", scope);

        expect(repo.getTopProblems).toHaveBeenCalledWith("session-1", scope);
    });
});
