import { InviteUserUseCase } from "./InviteUserUseCase";
import { CreateUserInput, IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";
import { IRoleRepository } from "../../../../roles/domain/IRoleRepository";
import { IDepartmentRepository } from "../../../../department/domain/IDepartmentRepository";
import { ILocationRepository } from "../../../../location/domain/ILocationRepository";

function makeUserRepo(overrides: Partial<IUserRepository> = {}): IUserRepository {
    return {
        findById: jest.fn(),
        findByEmail: jest.fn().mockResolvedValue(null),
        findAll: jest.fn(),
        create: jest.fn(async (input: CreateUserInput) => new User(
            {
                firstName: input.firstName,
                lastName: input.lastName,
                email: { value: input.email } as any,
                status: "INVITED",
                department: null,
                location: null,
                roles: [],
                lastLoginAt: null,
                invitationSentAt: new Date("2026-01-01T00:00:00Z"),
            },
            "user-1"
        )),
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

function makeRoleRepo(exists = true): IRoleRepository {
    return {
        findById: jest.fn().mockResolvedValue(exists ? ({ id: "role-1" } as any) : null),
        findByCode: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        archive: jest.fn(),
        setPermissions: jest.fn(),
        findAllPermissions: jest.fn(),
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

const validDTO = {
    email: "sarah@example.com",
    firstName: "Sarah",
    lastName: "Johnson",
    roleIds: ["role-1"],
    departmentId: "dept-1",
    locationId: "loc-1",
};

describe("InviteUserUseCase", () => {
    it("creates an invited user when all input is valid", async () => {
        const userRepo = makeUserRepo();
        const useCase = new InviteUserUseCase(userRepo, makeRoleRepo(), makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute(validDTO);

        expect(result.isSuccess).toBe(true);
        expect(result.getValue().status).toBe("INVITED");
        expect(userRepo.create).toHaveBeenCalledWith(
            expect.objectContaining({ email: "sarah@example.com", roleIds: ["role-1"] })
        );
    });

    it("fails when the email is invalid", async () => {
        const useCase = new InviteUserUseCase(makeUserRepo(), makeRoleRepo(), makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute({ ...validDTO, email: "not-an-email" });

        expect(result.isFailure).toBe(true);
    });

    it("fails with the existing user's id when the email is already registered", async () => {
        const userRepo = makeUserRepo({
            findByEmail: jest.fn().mockResolvedValue(new User({} as any, "existing-user-1")),
        });
        const useCase = new InviteUserUseCase(userRepo, makeRoleRepo(), makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute(validDTO);

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("USER_EMAIL_ALREADY_EXISTS:existing-user-1");
    });

    it("fails when a roleId does not exist", async () => {
        const useCase = new InviteUserUseCase(
            makeUserRepo(),
            makeRoleRepo(false),
            makeDepartmentRepo(),
            makeLocationRepo()
        );

        const result = await useCase.execute(validDTO);

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ROLE_NOT_FOUND:role-1");
    });

    it("fails when the departmentId does not exist", async () => {
        const useCase = new InviteUserUseCase(
            makeUserRepo(),
            makeRoleRepo(),
            makeDepartmentRepo(false),
            makeLocationRepo()
        );

        const result = await useCase.execute(validDTO);

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("DEPARTMENT_NOT_FOUND:dept-1");
    });

    it("fails when roleIds is empty", async () => {
        const useCase = new InviteUserUseCase(makeUserRepo(), makeRoleRepo(), makeDepartmentRepo(), makeLocationRepo());

        const result = await useCase.execute({ ...validDTO, roleIds: [] });

        expect(result.isFailure).toBe(true);
    });
});
