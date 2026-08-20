import { CreateRoleUseCase } from "./CreateRoleUseCase";
import { CreateRoleInput, IRoleRepository, UpdateRoleInput } from "../../../domain/IRoleRepository";
import { Permission } from "../../../domain/Permission";
import { Role } from "../../../domain/Role";

const catalogue: Permission[] = [
    { code: "user.read", name: "View users", description: "", category: "Users" },
    { code: "role.read", name: "View roles", description: "", category: "Roles" },
];

function makeRepo(overrides: Partial<IRoleRepository> = {}): IRoleRepository {
    return {
        findById: jest.fn(),
        findByCode: jest.fn().mockResolvedValue(null),
        findAll: jest.fn(),
        create: jest.fn(async (input: CreateRoleInput) => new Role(
            {
                code: input.code,
                name: input.name,
                description: input.description,
                type: "CUSTOM",
                userCount: 0,
                permissions: input.permissionCodes,
                archivedAt: null,
            },
            "role-1"
        )),
        update: jest.fn((_id: string, _input: UpdateRoleInput) => Promise.reject(new Error("not implemented"))),
        archive: jest.fn(),
        setPermissions: jest.fn(),
        findAllPermissions: jest.fn().mockResolvedValue(catalogue),
        ...overrides,
    };
}

describe("CreateRoleUseCase", () => {
    it("derives a code from the name and creates a CUSTOM role", async () => {
        const repo = makeRepo();
        const useCase = new CreateRoleUseCase(repo);

        const result = await useCase.execute({ name: "Compliance Manager", description: "Runs compliance training." });

        expect(result.isSuccess).toBe(true);
        expect(repo.create).toHaveBeenCalledWith(
            expect.objectContaining({ code: "COMPLIANCE_MANAGER", name: "Compliance Manager" })
        );
    });

    it("fails when the name is empty", async () => {
        const useCase = new CreateRoleUseCase(makeRepo());

        const result = await useCase.execute({ name: "" });

        expect(result.isFailure).toBe(true);
    });

    it("fails with the existing role's id when the derived code already exists", async () => {
        const repo = makeRepo({
            findByCode: jest.fn().mockResolvedValue(
                new Role(
                    { code: "MANAGER", name: "Manager", description: "", type: "SYSTEM", userCount: 0, permissions: [], archivedAt: null },
                    "existing-role-1"
                )
            ),
        });
        const useCase = new CreateRoleUseCase(repo);

        const result = await useCase.execute({ name: "Manager" });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_CODE_ALREADY_EXISTS:existing-role-1");
    });

    it("fails when a permission code is not in the catalogue", async () => {
        const repo = makeRepo();
        const useCase = new CreateRoleUseCase(repo);

        const result = await useCase.execute({ name: "Auditor", permissionCodes: ["user.read", "not.a.permission"] });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("PERMISSION_NOT_FOUND:not.a.permission");
        expect(repo.create).not.toHaveBeenCalled();
    });
});
