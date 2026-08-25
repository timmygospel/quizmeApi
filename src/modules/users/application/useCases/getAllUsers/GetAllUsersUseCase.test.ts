import { GetAllUsersUseCase, DEFAULT_PAGE_SIZE, MAX_PAGE_SIZE } from "./GetAllUsersUseCase";
import { IUserRepository, UserListFilters, UserListResult } from "../../../domain/IUserRepository";

function makeRepo(result: UserListResult, capture: { filters?: UserListFilters } = {}): IUserRepository {
    return {
        findById: jest.fn(),
        findByEmail: jest.fn(),
        findAll: jest.fn(async (filters: UserListFilters) => {
            capture.filters = filters;
            return result;
        }),
        create: jest.fn(),
        markInvitationSent: jest.fn(),
        updateStatus: jest.fn(),
        isSoleActiveAdministrator: jest.fn(),
        hasRole: jest.fn(),
        assignRole: jest.fn(),
        removeRole: jest.fn(),
        findEffectiveAccess: jest.fn(),
        findByAuthProviderUserId: jest.fn(),
        linkAuthProviderIdentity: jest.fn(),
        touchLastLogin: jest.fn(),
    };
}

describe("GetAllUsersUseCase", () => {
    it("defaults to page 1 and the default page size when none are given", async () => {
        const capture: { filters?: UserListFilters } = {};
        const useCase = new GetAllUsersUseCase(makeRepo({ items: [], totalItems: 0 }, capture));

        const result = await useCase.execute({});

        expect(result.isSuccess).toBe(true);
        expect(result.getValue().page).toBe(1);
        expect(result.getValue().pageSize).toBe(DEFAULT_PAGE_SIZE);
        expect(capture.filters).toMatchObject({ page: 1, pageSize: DEFAULT_PAGE_SIZE });
    });

    it("clamps a requested page size above the maximum", async () => {
        const capture: { filters?: UserListFilters } = {};
        const useCase = new GetAllUsersUseCase(makeRepo({ items: [], totalItems: 0 }, capture));

        const result = await useCase.execute({ pageSize: 500 });

        expect(result.getValue().pageSize).toBe(MAX_PAGE_SIZE);
        expect(capture.filters?.pageSize).toBe(MAX_PAGE_SIZE);
    });

    it("ignores a zero or negative page and falls back to page 1", async () => {
        const useCase = new GetAllUsersUseCase(makeRepo({ items: [], totalItems: 0 }));

        const result = await useCase.execute({ page: -1 });

        expect(result.getValue().page).toBe(1);
    });

    it("passes filters through to the repository", async () => {
        const capture: { filters?: UserListFilters } = {};
        const useCase = new GetAllUsersUseCase(makeRepo({ items: [], totalItems: 0 }, capture));

        await useCase.execute({
            search: "sarah",
            roleId: "role-1",
            departmentId: "dept-1",
            locationId: "loc-1",
            status: "ACTIVE",
        });

        expect(capture.filters).toMatchObject({
            search: "sarah",
            roleId: "role-1",
            departmentId: "dept-1",
            locationId: "loc-1",
            status: "ACTIVE",
        });
    });

    it("passes the caller's effective scope through to the repository", async () => {
        const capture: { filters?: UserListFilters } = {};
        const useCase = new GetAllUsersUseCase(makeRepo({ items: [], totalItems: 0 }, capture));
        const scope = { type: "SCOPED" as const, userId: "user-1", allLocations: false, locationIds: ["loc-1"], departmentIds: [] };

        await useCase.execute({ scope });

        expect(capture.filters?.scope).toEqual(scope);
    });

    it("returns a failure Result when the repository throws", async () => {
        const repo: IUserRepository = {
            findById: jest.fn(),
            findByEmail: jest.fn(),
            findAll: jest.fn().mockRejectedValue(new Error("connection lost")),
            create: jest.fn(),
            markInvitationSent: jest.fn(),
            updateStatus: jest.fn(),
            isSoleActiveAdministrator: jest.fn(),
            hasRole: jest.fn(),
            assignRole: jest.fn(),
            removeRole: jest.fn(),
            findEffectiveAccess: jest.fn(),
            findByAuthProviderUserId: jest.fn(),
            linkAuthProviderIdentity: jest.fn(),
            touchLastLogin: jest.fn(),
        };
        const useCase = new GetAllUsersUseCase(repo);

        const result = await useCase.execute({});

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("connection lost");
    });
});
