import { Request, Response } from "express";
import { createApplyEffectiveScope, createRequirePermission, requireAuthenticatedUser } from "./authorizationMiddleware";
import { IUserRepository, AssignedRoleScope } from "../../../modules/users/domain/IUserRepository";
import { IRoleRepository } from "../../../modules/roles/domain/IRoleRepository";
import { User } from "../../../modules/users/domain/User";
import { UserEmail } from "../../../modules/users/domain/valueObjects/UserEmail";
import { Role } from "../../../modules/roles/domain/Role";

function makeUser(): User {
    return new User(
        {
            firstName: "Sarah",
            lastName: "Johnson",
            email: UserEmail.create("sarah@example.com").getValue(),
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

function makeUserRepo(roleScopes: AssignedRoleScope[]): IUserRepository {
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
        findEffectiveAccess: jest.fn().mockResolvedValue(roleScopes),
        findByAuthProviderUserId: jest.fn(),
        linkAuthProviderIdentity: jest.fn(),
        touchLastLogin: jest.fn(),
    };
}

function makeRoleRepo(roles: Record<string, Role>): IRoleRepository {
    return {
        findById: jest.fn((id: string) => Promise.resolve(roles[id] ?? null)),
        findByCode: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        archive: jest.fn(),
        setPermissions: jest.fn(),
        findAllPermissions: jest.fn(),
    };
}

function makeRes(): Response {
    const res: Partial<Response> = {};
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res as Response;
}

describe("requireAuthenticatedUser", () => {
    it("401s when req.authUser is missing", () => {
        const req = {} as Request;
        const res = makeRes();
        const next = jest.fn();

        requireAuthenticatedUser(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("calls next when req.authUser is set", () => {
        const req = { authUser: makeUser() } as Request;
        const res = makeRes();
        const next = jest.fn();

        requireAuthenticatedUser(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
    });
});

describe("requirePermission", () => {
    const managerRole = new Role(
        { code: "MANAGER", name: "Manager", description: "", type: "SYSTEM", userCount: 1, permissions: ["participant.read"], archivedAt: null },
        "role-manager"
    );
    const roleScopes: AssignedRoleScope[] = [
        {
            role: { id: "role-manager", code: "MANAGER", name: "Manager" },
            allLocations: false,
            locations: [{ id: "loc-1", name: "Birmingham" }],
            departments: [{ id: "dep-1", name: "Operations" }],
        },
    ];

    it("401s when unauthenticated", async () => {
        const userRepo = makeUserRepo(roleScopes);
        const roleRepo = makeRoleRepo({ "role-manager": managerRole });
        const requirePermission = createRequirePermission(userRepo, roleRepo);
        const req = {} as Request;
        const res = makeRes();
        const next = jest.fn();

        await requirePermission("participant.read")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("403s when the resolved permission set doesn't include the required code", async () => {
        const userRepo = makeUserRepo(roleScopes);
        const roleRepo = makeRoleRepo({ "role-manager": managerRole });
        const requirePermission = createRequirePermission(userRepo, roleRepo);
        const req = { authUser: makeUser() } as Request;
        const res = makeRes();
        const next = jest.fn();

        await requirePermission("role.assign")(req, res, next);

        expect(res.status).toHaveBeenCalledWith(403);
        expect(next).not.toHaveBeenCalled();
    });

    it("calls next and caches effectiveAccess on req when the permission is granted", async () => {
        const userRepo = makeUserRepo(roleScopes);
        const roleRepo = makeRoleRepo({ "role-manager": managerRole });
        const requirePermission = createRequirePermission(userRepo, roleRepo);
        const req = { authUser: makeUser() } as Request;
        const res = makeRes();
        const next = jest.fn();

        await requirePermission("participant.read")(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(req.effectiveAccess?.permissions).toEqual(["participant.read"]);
        expect(userRepo.findEffectiveAccess).toHaveBeenCalledTimes(1);
    });
});

describe("applyEffectiveScope", () => {
    it("401s when unauthenticated", async () => {
        const userRepo = makeUserRepo([]);
        const roleRepo = makeRoleRepo({});
        const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);
        const req = {} as Request;
        const res = makeRes();
        const next = jest.fn();

        await applyEffectiveScope(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
    });

    it("resolves ORGANISATION scope for an org-wide role", async () => {
        const adminRole = new Role(
            { code: "ADMINISTRATOR", name: "Administrator", description: "", type: "SYSTEM", userCount: 1, permissions: [], archivedAt: null },
            "role-admin"
        );
        const roleScopes: AssignedRoleScope[] = [
            { role: { id: "role-admin", code: "ADMINISTRATOR", name: "Administrator" }, allLocations: false, locations: [], departments: [] },
        ];
        const userRepo = makeUserRepo(roleScopes);
        const roleRepo = makeRoleRepo({ "role-admin": adminRole });
        const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);
        const req = { authUser: makeUser() } as Request;
        const res = makeRes();
        const next = jest.fn();

        await applyEffectiveScope(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.effectiveScope).toEqual({
            type: "ORGANISATION",
            userId: "user-1",
            allLocations: true,
            locationIds: [],
            departmentIds: [],
        });
    });

    it("resolves SCOPED scope as the union of a user's non-self-only role scopes", async () => {
        const managerRole = new Role(
            { code: "MANAGER", name: "Manager", description: "", type: "SYSTEM", userCount: 1, permissions: [], archivedAt: null },
            "role-manager"
        );
        const trainerRole = new Role(
            { code: "TRAINER", name: "Trainer", description: "", type: "SYSTEM", userCount: 1, permissions: [], archivedAt: null },
            "role-trainer"
        );
        const roleScopes: AssignedRoleScope[] = [
            {
                role: { id: "role-manager", code: "MANAGER", name: "Manager" },
                allLocations: false,
                locations: [{ id: "loc-1", name: "Birmingham" }],
                departments: [{ id: "dep-1", name: "Operations" }],
            },
            {
                role: { id: "role-trainer", code: "TRAINER", name: "Trainer" },
                allLocations: false,
                locations: [{ id: "loc-1", name: "Birmingham" }],
                departments: [{ id: "dep-2", name: "Warehouse" }],
            },
        ];
        const userRepo = makeUserRepo(roleScopes);
        const roleRepo = makeRoleRepo({ "role-manager": managerRole, "role-trainer": trainerRole });
        const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);
        const req = { authUser: makeUser() } as Request;
        const res = makeRes();
        const next = jest.fn();

        await applyEffectiveScope(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.effectiveScope).toEqual({
            type: "SCOPED",
            userId: "user-1",
            allLocations: false,
            locationIds: ["loc-1"],
            departmentIds: ["dep-1", "dep-2"],
        });
    });

    it("resolves SELF scope for a Participant regardless of any stored scope rows", async () => {
        const participantRole = new Role(
            { code: "PARTICIPANT", name: "Participant", description: "", type: "SYSTEM", userCount: 1, permissions: [], archivedAt: null },
            "role-participant"
        );
        const roleScopes: AssignedRoleScope[] = [
            {
                role: { id: "role-participant", code: "PARTICIPANT", name: "Participant" },
                allLocations: false,
                locations: [{ id: "loc-1", name: "Birmingham" }],
                departments: [],
            },
        ];
        const userRepo = makeUserRepo(roleScopes);
        const roleRepo = makeRoleRepo({ "role-participant": participantRole });
        const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);
        const req = { authUser: makeUser() } as Request;
        const res = makeRes();
        const next = jest.fn();

        await applyEffectiveScope(req, res, next);

        expect(next).toHaveBeenCalled();
        expect(req.effectiveScope).toEqual({
            type: "SELF",
            userId: "user-1",
            allLocations: false,
            locationIds: [],
            departmentIds: [],
        });
    });

    it("resolves SELF scope for a user with no role assignments", async () => {
        const userRepo = makeUserRepo([]);
        const roleRepo = makeRoleRepo({});
        const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);
        const req = { authUser: makeUser() } as Request;
        const res = makeRes();
        const next = jest.fn();

        await applyEffectiveScope(req, res, next);

        expect(req.effectiveScope).toEqual({
            type: "SELF",
            userId: "user-1",
            allLocations: false,
            locationIds: [],
            departmentIds: [],
        });
    });

    it("reuses req.effectiveAccess cached by an earlier requirePermission call instead of recomputing it", async () => {
        const managerRole = new Role(
            { code: "MANAGER", name: "Manager", description: "", type: "SYSTEM", userCount: 1, permissions: ["participant.read"], archivedAt: null },
            "role-manager"
        );
        const roleScopes: AssignedRoleScope[] = [
            {
                role: { id: "role-manager", code: "MANAGER", name: "Manager" },
                allLocations: true,
                locations: [],
                departments: [],
            },
        ];
        const userRepo = makeUserRepo(roleScopes);
        const roleRepo = makeRoleRepo({ "role-manager": managerRole });
        const requirePermission = createRequirePermission(userRepo, roleRepo);
        const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);
        const req = { authUser: makeUser() } as Request;
        const res = makeRes();
        const next = jest.fn();

        await requirePermission("participant.read")(req, res, next);
        await applyEffectiveScope(req, res, next);

        expect(userRepo.findEffectiveAccess).toHaveBeenCalledTimes(1);
        expect(req.effectiveScope).toEqual({
            type: "SCOPED",
            userId: "user-1",
            allLocations: true,
            locationIds: [],
            departmentIds: [],
        });
    });
});
