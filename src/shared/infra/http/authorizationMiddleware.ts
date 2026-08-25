import { RequestHandler, Request } from "express";
import { IUserRepository } from "../../../modules/users/domain/IUserRepository";
import { IRoleRepository } from "../../../modules/roles/domain/IRoleRepository";
import { buildEffectiveAccess } from "../../../modules/users/application/useCases/shared/buildEffectiveAccess";
import { EffectiveAccessDTO } from "../../../modules/users/dtos/EffectiveAccessDTO";
import { isSelfOnlyRole } from "../../../modules/roles/domain/selfOnlyRoles";
import { EffectiveScope } from "../../core/EffectiveScope";

export { EffectiveScope, EffectiveScopeType } from "../../core/EffectiveScope";

// PERMISSIONS.md §11 "Backend Authorisation Pipeline":
//   Clerk authentication -> QuizAnalytics user mapping -> Organisation
//   membership -> Permission check -> Effective scope check -> Business-rule
//   check -> Controller/use case.
//
// authMiddleware.ts covers the first three steps (non-blocking — it only
// populates req.authUser). The three exports below are the next two steps.
// Wired into users/roles routes so far (userRoutes.ts, rolesRoutes.ts); other
// modules opt in per-endpoint as they're ready to start enforcing, e.g.:
//
//   router.get("/participants",
//       requireAuthenticatedUser,
//       requirePermission("participant.read"),
//       applyEffectiveScope,
//       (req, res) => controller.execute(req, res));

function unauthorized(res: Parameters<RequestHandler>[1]) {
    res.status(401).json({ message: "Unauthorized" });
}

// Step: "requireAuthenticatedUser". authMiddleware only *populates*
// req.authUser when a valid token is present; this is the first middleware
// that actually rejects a request for not having one.
export const requireAuthenticatedUser: RequestHandler = (req, res, next) => {
    if (!req.authUser?.id) {
        unauthorized(res);
        return;
    }
    next();
};

async function resolveEffectiveAccess(
    req: Request,
    userRepo: IUserRepository,
    roleRepo: IRoleRepository
): Promise<EffectiveAccessDTO> {
    if (!req.effectiveAccess) {
        req.effectiveAccess = await buildEffectiveAccess(req.authUser!.id!, userRepo, roleRepo);
    }
    return req.effectiveAccess;
}

// Step: "Permission check". Must run after requireAuthenticatedUser (or any
// middleware that guarantees req.authUser is set). Caches the resolved
// EffectiveAccessDTO on req.effectiveAccess so a following
// applyEffectiveScope doesn't recompute it.
export function createRequirePermission(userRepo: IUserRepository, roleRepo: IRoleRepository) {
    return function requirePermission(code: string): RequestHandler {
        return async (req, res, next) => {
            if (!req.authUser?.id) {
                unauthorized(res);
                return;
            }
            try {
                const access = await resolveEffectiveAccess(req, userRepo, roleRepo);
                if (!access.permissions.includes(code)) {
                    res.status(403).json({ message: `Missing permission: ${code}` });
                    return;
                }
                next();
            } catch (err) {
                console.error("[requirePermission]", err);
                res.status(500).json({ message: "An unexpected error occurred" });
            }
        };
    };
}

// Step: "Effective scope check". Resolves the union of the caller's role
// scopes (§14 "multiple roles") into a single filter for the
// controller/repository to apply. Must run after requireAuthenticatedUser;
// works whether or not requirePermission ran first on this request.
export function createApplyEffectiveScope(userRepo: IUserRepository, roleRepo: IRoleRepository) {
    const applyEffectiveScope: RequestHandler = async (req, res, next) => {
        if (!req.authUser?.id) {
            unauthorized(res);
            return;
        }
        const userId = req.authUser.id;

        try {
            const access = await resolveEffectiveAccess(req, userRepo, roleRepo);

            if (access.roles.some((r) => r.organisationWide)) {
                req.effectiveScope = { type: "ORGANISATION", userId, allLocations: true, locationIds: [], departmentIds: [] };
                return next();
            }

            const scopedRoles = access.roles.filter((r) => !isSelfOnlyRole(r.role.code));

            // Every assigned role is self-only (Participant), or the user has
            // no role assignments at all — narrowest possible scope, never
            // wider than SELF.
            if (scopedRoles.length === 0) {
                req.effectiveScope = { type: "SELF", userId, allLocations: false, locationIds: [], departmentIds: [] };
                return next();
            }

            const allLocations = scopedRoles.some((r) => r.allLocations);
            const locationIds = new Set<string>();
            const departmentIds = new Set<string>();
            for (const role of scopedRoles) {
                role.locations.forEach((l) => locationIds.add(l.id));
                role.departments.forEach((d) => departmentIds.add(d.id));
            }

            req.effectiveScope = {
                type: "SCOPED",
                userId,
                allLocations,
                locationIds: [...locationIds],
                departmentIds: [...departmentIds],
            };
            next();
        } catch (err) {
            console.error("[applyEffectiveScope]", err);
            res.status(500).json({ message: "An unexpected error occurred" });
        }
    };

    return applyEffectiveScope;
}
