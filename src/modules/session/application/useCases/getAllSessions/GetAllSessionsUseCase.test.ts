import { GetAllSessionsUseCase } from "./GetAllSessionsUseCase";
import { ISessionRepository } from "../../../domain/ISessionRepository";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

function makeRepo(overrides: Partial<ISessionRepository> = {}): ISessionRepository {
    return {
        findById: jest.fn(),
        findAll: jest.fn().mockResolvedValue([]),
        save: jest.fn(),
        ...overrides,
    };
}

describe("GetAllSessionsUseCase", () => {
    it("returns the repository's sessions", async () => {
        const useCase = new GetAllSessionsUseCase(makeRepo());

        const result = await useCase.execute();

        expect(result.isSuccess).toBe(true);
    });

    it("passes the caller's effective scope through to the repository", async () => {
        const repo = makeRepo();
        const useCase = new GetAllSessionsUseCase(repo);
        const scope: EffectiveScope = { type: "SCOPED", userId: "u", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        await useCase.execute(scope);

        expect(repo.findAll).toHaveBeenCalledWith(scope);
    });

    it("returns a failure Result when the repository throws", async () => {
        const repo = makeRepo({ findAll: jest.fn().mockRejectedValue(new Error("connection lost")) });
        const useCase = new GetAllSessionsUseCase(repo);

        const result = await useCase.execute();

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("connection lost");
    });
});
