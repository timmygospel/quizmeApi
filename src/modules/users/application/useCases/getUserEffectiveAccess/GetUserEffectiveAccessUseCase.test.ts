import { GetUserEffectiveAccessUseCase } from "./GetUserEffectiveAccessUseCase";
import { AssignedRoleScope, IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";
import { IRoleRepository } from "../../../../roles/domain/IRoleRepository";
import { Role } from "../../../../roles/domain/Role";

function makeUser(): User {
    return new User(
        {
            firstName: "Sarah",
            lastName: "Johnson",
            email: { value: "sarah@example.com" } as any,
            status: "ACTIVE",
            department: null,
            location: null,
            roles: [],
            lastLoginAt: null,
            invitationSentAt: null,
        },
        "user-1"
    );
}

function makeRole(id: string, code: string, permissions: string[]): Role {
    return new Role({ code, name: code, description: "", type: "SYSTEM", userCount: 0, permissions, archivedAt: null }, id);
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
        ...overrides,
    };
}

function makeRoleRepo(overrides: Partial<IRoleRepository> = {}): IRoleRepository {
    return {
        findById: jest.fn(),
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

describe("GetUserEffectiveAccessUseCase", () => {
    it("fails when the user does not exist", async () => {
        const userRepo = makeUserRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new GetUserEffectiveAccessUseCase(userRepo, makeRoleRepo());

        const result = await useCase.execute("missing-user");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_NOT_FOUND");
    });

    it("marks Administrator/Executive as organisation-wide and unions permissions across roles", async () => {
        const roleScopes: AssignedRoleScope[] = [
            { role: { id: "role-admin", code: "ADMINISTRATOR", name: "Administrator" }, allLocations: false, locations: [], departments: [] },
            {
                role: { id: "role-mgr", code: "MANAGER", name: "Manager" },
                allLocations: false,
                locations: [{ id: "loc-1", name: "Birmingham" }],
                departments: [{ id: "dept-1", name: "Operations" }],
            },
        ];
        const userRepo = makeUserRepo({ findEffectiveAccess: jest.fn().mockResolvedValue(roleScopes) });
        const roleRepo = makeRoleRepo({
            findById: jest.fn(async (id: string) => {
                if (id === "role-admin") return makeRole("role-admin", "ADMINISTRATOR", ["user.read", "role.read"]);
                if (id === "role-mgr") return makeRole("role-mgr", "MANAGER", ["user.read"]);
                return null;
            }),
        });
        const useCase = new GetUserEffectiveAccessUseCase(userRepo, roleRepo);

        const result = await useCase.execute("user-1");

        expect(result.isSuccess).toBe(true);
        const access = result.getValue();
        expect(access.userId).toBe("user-1");
        expect(access.permissions.sort()).toEqual(["role.read", "user.read"]);
        expect(access.roles).toEqual([
            {
                role: { id: "role-admin", code: "ADMINISTRATOR", name: "Administrator" },
                organisationWide: true,
                allLocations: false,
                locations: [],
                departments: [],
            },
            {
                role: { id: "role-mgr", code: "MANAGER", name: "Manager" },
                organisationWide: false,
                allLocations: false,
                locations: [{ id: "loc-1", name: "Birmingham" }],
                departments: [{ id: "dept-1", name: "Operations" }],
            },
        ]);
    });
});
