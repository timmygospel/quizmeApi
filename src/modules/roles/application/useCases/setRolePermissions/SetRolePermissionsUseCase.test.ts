import { SetRolePermissionsUseCase } from "./SetRolePermissionsUseCase";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Permission } from "../../../domain/Permission";
import { Role } from "../../../domain/Role";

const catalogue: Permission[] = [
    { code: "user.read", name: "View users", description: "", category: "Users" },
    { code: "role.read", name: "View roles", description: "", category: "Roles" },
];

function makeRole(archivedAt: Date | null = null): Role {
    return new Role(
        { code: "MANAGER", name: "Manager", description: "", type: "SYSTEM", userCount: 3, permissions: [], archivedAt },
        "role-1"
    );
}

function makeRepo(overrides: Partial<IRoleRepository> = {}): IRoleRepository {
    return {
        findById: jest.fn(),
        findByCode: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        archive: jest.fn(),
        setPermissions: jest.fn(),
        findAllPermissions: jest.fn().mockResolvedValue(catalogue),
        ...overrides,
    };
}

describe("SetRolePermissionsUseCase", () => {
    it("replaces a role's permission set", async () => {
        const updated = new Role(
            { code: "MANAGER", name: "Manager", description: "", type: "SYSTEM", userCount: 3, permissions: ["user.read"], archivedAt: null },
            "role-1"
        );
        const repo = makeRepo({
            findById: jest.fn().mockResolvedValue(makeRole()),
            setPermissions: jest.fn().mockResolvedValue(updated),
        });
        const useCase = new SetRolePermissionsUseCase(repo);

        const result = await useCase.execute({ roleId: "role-1", permissionCodes: ["user.read"] });

        expect(result.isSuccess).toBe(true);
        expect(repo.setPermissions).toHaveBeenCalledWith("role-1", ["user.read"]);
    });

    it("fails when the role does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new SetRolePermissionsUseCase(repo);

        const result = await useCase.execute({ roleId: "missing-role", permissionCodes: [] });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_NOT_FOUND");
    });

    it("refuses to edit permissions on an archived role", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeRole(new Date("2026-01-01T00:00:00Z"))) });
        const useCase = new SetRolePermissionsUseCase(repo);

        const result = await useCase.execute({ roleId: "role-1", permissionCodes: [] });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_ARCHIVED");
    });

    it("fails when a permission code is not in the catalogue", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeRole()) });
        const useCase = new SetRolePermissionsUseCase(repo);

        const result = await useCase.execute({ roleId: "role-1", permissionCodes: ["not.a.permission"] });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("PERMISSION_NOT_FOUND:not.a.permission");
        expect(repo.setPermissions).not.toHaveBeenCalled();
    });
});
