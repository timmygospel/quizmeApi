import { RemoveUserRoleUseCase } from "./RemoveUserRoleUseCase";
import { AssignedRoleScope, IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";
import { IRoleRepository } from "../../../../roles/domain/IRoleRepository";
import { Role } from "../../../../roles/domain/Role";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

function makeUser(locationId: string | null = null): User {
    return new User(
        {
            firstName: "Sarah",
            lastName: "Johnson",
            email: { value: "sarah@example.com" } as any,
            status: "ACTIVE",
            department: null,
            location: locationId ? { id: locationId, name: "Birmingham" } : null,
            roles: [],
            lastLoginAt: null,
            invitationSentAt: null,
        },
        "user-1"
    );
}

function makeRole(code: string): Role {
    return new Role(
        { code, name: code, description: "", type: "SYSTEM", userCount: 0, permissions: [], archivedAt: null },
        "role-1"
    );
}

function makeUserRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
    return {
        findById: jest.fn().mockResolvedValue(makeUser()),
        findByEmail: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        markInvitationSent: jest.fn(),
        updateStatus: jest.fn(),
        isSoleActiveAdministrator: jest.fn().mockResolvedValue(false),
        hasRole: jest.fn().mockResolvedValue(true),
        assignRole: jest.fn(),
        removeRole: jest.fn(),
        findEffectiveAccess: jest.fn().mockResolvedValue([] as AssignedRoleScope[]),
        findByAuthProviderUserId: jest.fn(),
        linkAuthProviderIdentity: jest.fn(),
        touchLastLogin: jest.fn(),
        ...overrides,
    };
}

function makeRoleRepo(overrides: Partial<IRoleRepository> = {}): IRoleRepository {
    return {
        findById: jest.fn().mockResolvedValue(makeRole("MANAGER")),
        findByCode: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        archive: jest.fn(),
        setPermissions: jest.fn(),
        findAllPermissions: jest.fn(),
        ...overrides,
    };
}

describe("RemoveUserRoleUseCase", () => {
    it("removes a role assignment", async () => {
        const userRepo = makeUserRepo();
        const useCase = new RemoveUserRoleUseCase(userRepo, makeRoleRepo());

        const result = await useCase.execute("user-1", "role-1");

        expect(result.isSuccess).toBe(true);
        expect(userRepo.removeRole).toHaveBeenCalledWith("user-1", "role-1");
    });

    it("fails when the user does not exist", async () => {
        const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new RemoveUserRoleUseCase(userRepo, makeRoleRepo());

        const result = await useCase.execute("missing-user", "role-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_NOT_FOUND");
    });

    it("fails with USER_NOT_FOUND when the user exists but is outside the caller's scope", async () => {
        const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(makeUser("loc-2")) });
        const useCase = new RemoveUserRoleUseCase(userRepo, makeRoleRepo());
        const scope: EffectiveScope = { type: "SCOPED", userId: "caller", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        const result = await useCase.execute("user-1", "role-1", scope);

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_NOT_FOUND");
        expect(userRepo.removeRole).not.toHaveBeenCalled();
    });

    it("fails when the role isn't assigned to the user", async () => {
        const userRepo = makeUserRepo({ hasRole: jest.fn().mockResolvedValue(false) });
        const useCase = new RemoveUserRoleUseCase(userRepo, makeRoleRepo());

        const result = await useCase.execute("user-1", "role-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_NOT_ASSIGNED");
    });

    it("refuses to remove the Administrator role from the sole active Administrator", async () => {
        const userRepo = makeUserRepo({ isSoleActiveAdministrator: jest.fn().mockResolvedValue(true) });
        const roleRepo = makeRoleRepo({ findById: jest.fn().mockResolvedValue(makeRole("ADMINISTRATOR")) });
        const useCase = new RemoveUserRoleUseCase(userRepo, roleRepo);

        const result = await useCase.execute("user-1", "role-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("LAST_ACTIVE_ADMINISTRATOR");
        expect(userRepo.removeRole).not.toHaveBeenCalled();
    });

    it("allows removing a non-Administrator role even if the user is the sole active Administrator", async () => {
        const userRepo = makeUserRepo({ isSoleActiveAdministrator: jest.fn().mockResolvedValue(true) });
        const roleRepo = makeRoleRepo({ findById: jest.fn().mockResolvedValue(makeRole("MANAGER")) });
        const useCase = new RemoveUserRoleUseCase(userRepo, roleRepo);

        const result = await useCase.execute("user-1", "role-1");

        expect(result.isSuccess).toBe(true);
        expect(userRepo.removeRole).toHaveBeenCalledWith("user-1", "role-1");
    });
});
