import { ArchiveRoleUseCase } from "./ArchiveRoleUseCase";
import { IRoleRepository } from "../../../domain/IRoleRepository";
import { Role, RoleType } from "../../../domain/Role";

function makeRole(type: RoleType, archivedAt: Date | null = null): Role {
    return new Role(
        { code: "MANAGER", name: "Manager", description: "", type, userCount: 3, permissions: [], archivedAt },
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

describe("ArchiveRoleUseCase", () => {
    it("archives a CUSTOM role", async () => {
        const archived = makeRole("CUSTOM", new Date("2026-01-01T00:00:00Z"));
        const repo = makeRepo({
            findById: jest.fn().mockResolvedValue(makeRole("CUSTOM")),
            archive: jest.fn().mockResolvedValue(archived),
        });
        const useCase = new ArchiveRoleUseCase(repo);

        const result = await useCase.execute("role-1");

        expect(result.isSuccess).toBe(true);
        expect(repo.archive).toHaveBeenCalledWith("role-1");
    });

    it("fails when the role does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new ArchiveRoleUseCase(repo);

        const result = await useCase.execute("missing-role");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_NOT_FOUND");
    });

    it("refuses to archive a SYSTEM role", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeRole("SYSTEM")) });
        const useCase = new ArchiveRoleUseCase(repo);

        const result = await useCase.execute("role-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("CANNOT_ARCHIVE_SYSTEM_ROLE");
        expect(repo.archive).not.toHaveBeenCalled();
    });

    it("refuses to archive an already archived role", async () => {
        const repo = makeRepo({
            findById: jest.fn().mockResolvedValue(makeRole("CUSTOM", new Date("2026-01-01T00:00:00Z"))),
        });
        const useCase = new ArchiveRoleUseCase(repo);

        const result = await useCase.execute("role-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_ALREADY_ARCHIVED");
    });
});
