import { AssignUserRoleUseCase } from "./AssignUserRoleUseCase";
import { AssignedRoleScope, IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";
import { IRoleRepository } from "../../../../roles/domain/IRoleRepository";
import { IDepartmentRepository } from "../../../../department/domain/IDepartmentRepository";
import { ILocationRepository } from "../../../../location/domain/ILocationRepository";
import { Role } from "../../../../roles/domain/Role";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";

function makeUser(status: User["status"] = "ACTIVE", locationId: string | null = null): User {
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

function makeRole(code: string, archivedAt: Date | null = null): Role {
    return new Role(
        { code, name: code, description: "", type: "SYSTEM", userCount: 0, permissions: [], archivedAt },
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
        isSoleActiveAdministrator: jest.fn(),
        hasRole: jest.fn(),
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

function makeDepartmentRepo(exists = true): IDepartmentRepository {
    return {
        findById: jest.fn().mockResolvedValue(exists ? ({ id: "dept-1" } as any) : null),
        findAll: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };
}

function makeLocationRepo(exists = true): ILocationRepository {
    return {
        findById: jest.fn().mockResolvedValue(exists ? ({ id: "loc-1" } as any) : null),
        findAll: jest.fn(),
        save: jest.fn(),
        delete: jest.fn(),
    };
}

describe("AssignUserRoleUseCase", () => {
    it("assigns a scoped role and returns the updated effective access", async () => {
        const userRepo = makeUserRepo();
        const useCase = new AssignUserRoleUseCase(userRepo, makeRoleRepo(), makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute({
            userId: "user-1",
            roleId: "role-1",
            locationIds: ["loc-1"],
            departmentIds: ["dept-1"],
        });

        expect(result.isSuccess).toBe(true);
        expect(userRepo.assignRole).toHaveBeenCalledWith("user-1", "role-1", {
            allLocations: false,
            locationIds: ["loc-1"],
            departmentIds: ["dept-1"],
        });
    });

    it("fails when the user does not exist", async () => {
        const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new AssignUserRoleUseCase(userRepo, makeRoleRepo(), makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute({ userId: "missing", roleId: "role-1", allLocations: true });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_NOT_FOUND");
    });

    it("fails with USER_NOT_FOUND when the target user exists but is outside the caller's scope", async () => {
        const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(makeUser("ACTIVE", "loc-2")) });
        const useCase = new AssignUserRoleUseCase(userRepo, makeRoleRepo(), makeDepartmentRepo(), makeLocationRepo());
        const scope: EffectiveScope = { type: "SCOPED", userId: "caller", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        const result = await useCase.execute({ userId: "user-1", roleId: "role-1", allLocations: true }, scope);

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_NOT_FOUND");
        expect(userRepo.assignRole).not.toHaveBeenCalled();
    });

    it("refuses to assign new roles to an archived user", async () => {
        const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(makeUser("ARCHIVED")) });
        const useCase = new AssignUserRoleUseCase(userRepo, makeRoleRepo(), makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute({ userId: "user-1", roleId: "role-1", allLocations: true });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_ARCHIVED");
    });

    it("refuses to scope an organisation-wide role", async () => {
        const roleRepo = makeRoleRepo({ findById: jest.fn().mockResolvedValue(makeRole("ADMINISTRATOR")) });
        const useCase = new AssignUserRoleUseCase(makeUserRepo(), roleRepo, makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute({ userId: "user-1", roleId: "role-1", locationIds: ["loc-1"] });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ORG_WIDE_ROLE_CANNOT_BE_SCOPED");
    });

    it("allows an organisation-wide role with no scope", async () => {
        const roleRepo = makeRoleRepo({ findById: jest.fn().mockResolvedValue(makeRole("EXECUTIVE")) });
        const userRepo = makeUserRepo();
        const useCase = new AssignUserRoleUseCase(userRepo, roleRepo, makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute({ userId: "user-1", roleId: "role-1" });

        expect(result.isSuccess).toBe(true);
        expect(userRepo.assignRole).toHaveBeenCalledWith("user-1", "role-1", {
            allLocations: false,
            locationIds: [],
            departmentIds: [],
        });
    });

    it("requires explicit scope for a non-organisation-wide role", async () => {
        const useCase = new AssignUserRoleUseCase(makeUserRepo(), makeRoleRepo(), makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute({ userId: "user-1", roleId: "role-1" });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("SCOPE_REQUIRED");
    });

    it("fails when a location id does not exist", async () => {
        const useCase = new AssignUserRoleUseCase(
            makeUserRepo(),
            makeRoleRepo(),
            makeDepartmentRepo(),
            makeLocationRepo(false)
        );

        const result = await useCase.execute({ userId: "user-1", roleId: "role-1", locationIds: ["loc-1"] });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("LOCATION_NOT_FOUND:loc-1");
    });

    it("fails when the role is archived", async () => {
        const roleRepo = makeRoleRepo({
            findById: jest.fn().mockResolvedValue(makeRole("MANAGER", new Date("2026-01-01T00:00:00Z"))),
        });
        const useCase = new AssignUserRoleUseCase(makeUserRepo(), roleRepo, makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute({ userId: "user-1", roleId: "role-1", allLocations: true });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_ARCHIVED");
    });
});
