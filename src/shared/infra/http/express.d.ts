import { User } from "../../../modules/users/domain/User";
import { EffectiveAccessDTO } from "../../../modules/users/dtos/EffectiveAccessDTO";
import { EffectiveScope } from "../../core/EffectiveScope";

declare global {
    namespace Express {
        interface Request {
            // Populated by authMiddleware when the request carries a verified
            // bearer token. authIdentity is set whenever the provider verifies
            // the token; authUser is set only once that identity resolves to
            // (or gets linked to) a row in our own users table. Neither route
            // currently requires these — no route protection has been wired
            // up yet (AUTH-001 infra phase).
            authIdentity?: { provider: string; providerUserId: string; email: string | null };
            authUser?: User | null;

            // Populated by requirePermission/applyEffectiveScope (AUTH-002
            // §11). effectiveAccess is cached here so a requirePermission
            // check followed by applyEffectiveScope on the same request only
            // resolves it once; effectiveScope is the union-of-roles filter a
            // controller/repository applies to a query.
            effectiveAccess?: EffectiveAccessDTO;
            effectiveScope?: EffectiveScope;
        }
    }
}

export {};
