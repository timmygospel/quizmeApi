import { GetSessionUseCase } from "./GetSessionUseCase";
import { ISessionRepository } from "../../../domain/ISessionRepository";
import { Session } from "../../../domain/Session";
import { SessionName } from "../../../domain/valueObjects/SessionName";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

function makeSession(locationIds: string[] = []): Session {
    return new Session(
        {
            templateId: "template-1",
            name: SessionName.create("Q1 Compliance").getValue(),
            departmentIds: [],
            locationIds,
            allLocations: false,
            sectionIds: [],
            host: "Jane Doe",
            sessionType: "assessment",
            passThreshold: 70,
            allowMultipleAttempts: false,
            additionalNotes: "",
        },
        "session-1"
    );
}

function makeRepo(session: Session | null): ISessionRepository {
    return {
        findById: jest.fn().mockResolvedValue(session),
        findAll: jest.fn(),
        save: jest.fn(),
    };
}

describe("GetSessionUseCase", () => {
    it("fails when the session doesn't exist", async () => {
        const useCase = new GetSessionUseCase(makeRepo(null));

        const result = await useCase.execute("missing-id");

        expect(result.isFailure).toBe(true);
    });

    it("succeeds when no scope is given", async () => {
        const useCase = new GetSessionUseCase(makeRepo(makeSession()));

        const result = await useCase.execute("session-1");

        expect(result.isSuccess).toBe(true);
    });

    it("succeeds when the session is within the caller's scope", async () => {
        const useCase = new GetSessionUseCase(makeRepo(makeSession(["loc-1"])));
        const scope: EffectiveScope = { type: "SCOPED", userId: "caller", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        const result = await useCase.execute("session-1", scope);

        expect(result.isSuccess).toBe(true);
    });

    it("fails with the same not-found error when the session exists but is outside the caller's scope", async () => {
        const useCase = new GetSessionUseCase(makeRepo(makeSession(["loc-2"])));
        const scope: EffectiveScope = { type: "SCOPED", userId: "caller", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        const missing = await new GetSessionUseCase(makeRepo(null)).execute("session-1");
        const outOfScope = await useCase.execute("session-1", scope);

        expect(outOfScope.isFailure).toBe(true);
        expect(outOfScope.errorValue()).toBe(missing.errorValue());
    });
});
