import { UpdateRoleUseCase } from "./UpdateRoleUseCase";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Role } from "../../../domain/Role";

function makeRole(archivedAt: Date | null = null): Role {
    return new Role(
        { code: "MANAGER", name: "Manager", description: "Old description.", type: "SYSTEM", userCount: 3, permissions: [], archivedAt },
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
        findAllPermissions: jest.fn(),
        ...overrides,
    };
}

describe("UpdateRoleUseCase", () => {
    it("updates a role's name and description", async () => {
        const updated = new Role(
            { code: "MANAGER", name: "Team Manager", description: "New description.", type: "SYSTEM", userCount: 3, permissions: [], archivedAt: null },
            "role-1"
        );
        const repo = makeRepo({
            findById: jest.fn().mockResolvedValue(makeRole()),
            update: jest.fn().mockResolvedValue(updated),
        });
        const useCase = new UpdateRoleUseCase(repo);

        const result = await useCase.execute({ id: "role-1", name: "Team Manager", description: "New description." });

        expect(result.isSuccess).toBe(true);
        expect(repo.update).toHaveBeenCalledWith("role-1", { name: "Team Manager", description: "New description." });
    });

    it("fails when the role does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new UpdateRoleUseCase(repo);

        const result = await useCase.execute({ id: "missing-role", name: "New name" });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_NOT_FOUND");
    });

    it("refuses to edit an archived role", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeRole(new Date("2026-01-01T00:00:00Z"))) });
        const useCase = new UpdateRoleUseCase(repo);

        const result = await useCase.execute({ id: "role-1", name: "New name" });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_ARCHIVED");
        expect(repo.update).not.toHaveBeenCalled();
    });

    it("fails when name is provided but empty", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeRole()) });
        const useCase = new UpdateRoleUseCase(repo);

        const result = await useCase.execute({ id: "role-1", name: "  " });

        expect(result.isFailure).toBe(true);
        expect(repo.update).not.toHaveBeenCalled();
    });
});
