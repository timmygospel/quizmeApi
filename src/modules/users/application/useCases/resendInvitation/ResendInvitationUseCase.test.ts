import { ResendInvitationUseCase } from "./ResendInvitationUseCase";
import { IUserRepository } from "../../../domain/IUserRepository";
import { User, UserStatus } from "../../../domain/User";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

function makeUser(status: UserStatus, locationId: string | null = null): User {
    return new User(
        {
            firstName: "Sarah",
            lastName: "Johnson",
            email: { value: "sarah@example.com" } as any,
            status,
            department: null,
            location: locationId ? { id: locationId, name: "Birmingham" } : null,
            roles: [],
            lastLoginAt: null,
            invitationSentAt: null,
        },
        "user-1"
    );
}

function makeRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
    return {
        findById: jest.fn(),
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
        ...overrides,
    };
}

describe("ResendInvitationUseCase", () => {
    it("re-sends the invitation for an INVITED user", async () => {
        const resent = makeUser("INVITED");
        const repo = makeRepo({
            findById: jest.fn().mockResolvedValue(makeUser("INVITED")),
            markInvitationSent: jest.fn().mockResolvedValue(resent),
        });
        const useCase = new ResendInvitationUseCase(repo);

        const result = await useCase.execute("user-1");

        expect(result.isSuccess).toBe(true);
        expect(repo.markInvitationSent).toHaveBeenCalledWith("user-1");
    });

    it("fails when the user does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new ResendInvitationUseCase(repo);

        const result = await useCase.execute("missing-user");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_NOT_FOUND");
    });

    it("fails with USER_NOT_FOUND when the user exists but is outside the caller's scope", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeUser("INVITED", "loc-2")) });
        const useCase = new ResendInvitationUseCase(repo);
        const scope: EffectiveScope = { type: "SCOPED", userId: "caller", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        const result = await useCase.execute("user-1", scope);

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_NOT_FOUND");
        expect(repo.markInvitationSent).not.toHaveBeenCalled();
    });

    it("fails when the user is not in the INVITED status", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeUser("ACTIVE")) });
        const useCase = new ResendInvitationUseCase(repo);

        const result = await useCase.execute("user-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_NOT_INVITED");
        expect(repo.markInvitationSent).not.toHaveBeenCalled();
    });
});
