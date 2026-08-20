import { ActivateUserUseCase } from "./ActivateUserUseCase";
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
        isSoleActiveAdministrator: jest.fn(),
        hasRole: jest.fn(),
        assignRole: jest.fn(),
        removeRole: jest.fn(),
        findEffectiveAccess: jest.fn(),
        ...overrides,
    };
}

describe("ActivateUserUseCase", () => {
    it.each<UserStatus>(["INVITED", "SUSPENDED"])("activates a %s user", async (status) => {
        const activated = makeUser("ACTIVE");
        const repo = makeRepo({
            findById: jest.fn().mockResolvedValue(makeUser(status)),
            updateStatus: jest.fn().mockResolvedValue(activated),
        });
        const useCase = new ActivateUserUseCase(repo);

        const result = await useCase.execute("user-1");

        expect(result.isSuccess).toBe(true);
        expect(repo.updateStatus).toHaveBeenCalledWith("user-1", "ACTIVE");
    });

    it("fails when the user does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new ActivateUserUseCase(repo);

        const result = await useCase.execute("missing-user");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_NOT_FOUND");
    });

    it("refuses to activate an ARCHIVED user", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeUser("ARCHIVED")) });
        const useCase = new ActivateUserUseCase(repo);

        const result = await useCase.execute("user-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("INVALID_STATUS_TRANSITION:ARCHIVED");
        expect(repo.updateStatus).not.toHaveBeenCalled();
    });

    it("refuses to activate an already ACTIVE user", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeUser("ACTIVE")) });
        const useCase = new ActivateUserUseCase(repo);

        const result = await useCase.execute("user-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("INVALID_STATUS_TRANSITION:ACTIVE");
    });
});
