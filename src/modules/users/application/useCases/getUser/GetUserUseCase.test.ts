import { GetUserUseCase } from "./GetUserUseCase";
import { IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";
import { UserEmail } from "../../../domain/valueObjects/UserEmail";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

function makeUser(overrides: { locationId?: string | null } = {}): User {
    return new User(
        {
            firstName: "Sarah",
            lastName: "Johnson",
            email: UserEmail.create("sarah@example.com").getValue(),
            status: "ACTIVE",
            department: null,
            location: overrides.locationId ? { id: overrides.locationId, name: "Birmingham" } : null,
            roles: [],
            lastLoginAt: null,
            invitationSentAt: null,
        },
        "user-1"
    );
}

function makeRepo(user: User | null): IUserRepository {
    return {
        findById: jest.fn().mockResolvedValue(user),
        findByEmail: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        markInvitationSent: jest.fn(),
        updateStatus: jest.fn(),
        isSoleActiveAdministrator: jest.fn(),
        hasRole: jest.fn(),
        assignRole: jest.fn(),
        removeRole: jest.fn(),
        findEffectiveAccess: jest.fn(),
        findByAuthProviderUserId: jest.fn(),
        linkAuthProviderIdentity: jest.fn(),
        touchLastLogin: jest.fn(),
    };
}

describe("GetUserUseCase", () => {
    it("fails when the user doesn't exist", async () => {
        const useCase = new GetUserUseCase(makeRepo(null));

        const result = await useCase.execute("missing-id");

        expect(result.isFailure).toBe(true);
    });

    it("succeeds when no scope is given (unscoped caller)", async () => {
        const useCase = new GetUserUseCase(makeRepo(makeUser()));

        const result = await useCase.execute("user-1");

        expect(result.isSuccess).toBe(true);
        expect(result.getValue().id).toBe("user-1");
    });

    it("succeeds when the user is within the caller's scope", async () => {
        const useCase = new GetUserUseCase(makeRepo(makeUser({ locationId: "loc-1" })));
        const scope: EffectiveScope = { type: "SCOPED", userId: "caller", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        const result = await useCase.execute("user-1", scope);

        expect(result.isSuccess).toBe(true);
    });

    it("fails with the same not-found error when the user exists but is outside the caller's scope", async () => {
        const useCase = new GetUserUseCase(makeRepo(makeUser({ locationId: "loc-2" })));
        const scope: EffectiveScope = { type: "SCOPED", userId: "caller", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        const missing = await new GetUserUseCase(makeRepo(null)).execute("user-1");
        const outOfScope = await useCase.execute("user-1", scope);

        expect(outOfScope.isFailure).toBe(true);
        expect(outOfScope.errorValue()).toBe(missing.errorValue());
    });
});
