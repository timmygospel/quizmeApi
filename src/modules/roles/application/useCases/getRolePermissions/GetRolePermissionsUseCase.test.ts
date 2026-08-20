import { GetRolePermissionsUseCase } from "./GetRolePermissionsUseCase";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Permission } from "../../../domain/Permission";
import { Role } from "../../../domain/Role";

const catalogue: Permission[] = [
    { code: "user.read", name: "View users", description: "", category: "Users" },
    { code: "role.read", name: "View roles", description: "", category: "Roles" },
];

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

describe("GetRolePermissionsUseCase", () => {
    it("marks the role's granted permissions against the full catalogue", async () => {
        const role = new Role(
            { code: "MANAGER", name: "Manager", description: "", type: "SYSTEM", userCount: 3, permissions: ["user.read"], archivedAt: null },
            "role-1"
        );
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(role) });
        const useCase = new GetRolePermissionsUseCase(repo);

        const result = await useCase.execute("role-1");

        expect(result.isSuccess).toBe(true);
        expect(result.getValue()).toEqual([
            { code: "user.read", name: "View users", description: "", category: "Users", granted: true },
            { code: "role.read", name: "View roles", description: "", category: "Roles", granted: false },
        ]);
    });

    it("fails when the role does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new GetRolePermissionsUseCase(repo);

        const result = await useCase.execute("missing-role");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_NOT_FOUND");
    });
});
