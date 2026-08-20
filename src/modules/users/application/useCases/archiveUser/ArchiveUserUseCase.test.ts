import { ArchiveUserUseCase } from "./ArchiveUserUseCase";
import { IUserRepository } from "../../../domain/IUserRepository";
import { User, UserStatus } from "../../../domain/User";

function makeUser(status: UserStatus): User {
    return new User(
        {
            firstName: "Sarah",
            lastName: "Johnson",
            email: { value: "sarah@example.com" } as any,
            status,
            department: null,
            location: null,
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
        isSoleActiveAdministrator: jest.fn().mockResolvedValue(false),
        hasRole: jest.fn(),
        assignRole: jest.fn(),
        removeRole: jest.fn(),
        findEffectiveAccess: jest.fn(),
        ...overrides,
    };
}

describe("ArchiveUserUseCase", () => {
    it.each<UserStatus>(["INVITED", "ACTIVE", "SUSPENDED"])("archives a %s user", async (status) => {
        const archived = makeUser("ARCHIVED");
        const repo = makeRepo({
            findById: jest.fn().mockResolvedValue(makeUser(status)),
            updateStatus: jest.fn().mockResolvedValue(archived),
        });
        const useCase = new ArchiveUserUseCase(repo);

        const result = await useCase.execute("user-1");

        expect(result.isSuccess).toBe(true);
        expect(repo.updateStatus).toHaveBeenCalledWith("user-1", "ARCHIVED");
    });

    it("fails when the user does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new ArchiveUserUseCase(repo);

        const result = await useCase.execute("missing-user");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_NOT_FOUND");
    });

    it("refuses to archive an already ARCHIVED user", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeUser("ARCHIVED")) });
        const useCase = new ArchiveUserUseCase(repo);

        const result = await useCase.execute("user-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("INVALID_STATUS_TRANSITION:ARCHIVED");
        expect(repo.updateStatus).not.toHaveBeenCalled();
    });

    it("refuses to archive the sole active Administrator", async () => {
        const repo = makeRepo({
            findById: jest.fn().mockResolvedValue(makeUser("ACTIVE")),
            isSoleActiveAdministrator: jest.fn().mockResolvedValue(true),
        });
        const useCase = new ArchiveUserUseCase(repo);

        const result = await useCase.execute("user-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("LAST_ACTIVE_ADMINISTRATOR");
        expect(repo.updateStatus).not.toHaveBeenCalled();
    });
});
