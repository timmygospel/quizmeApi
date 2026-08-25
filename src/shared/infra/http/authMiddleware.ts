import { RequestHandler } from "express";
import { IAuthProvider } from "../auth/IAuthProvider";
import { IUserRepository } from "../../../modules/users/domain/IUserRepository";

// Non-blocking by design (AUTH-001 infra phase — no route requires auth yet).
// When a valid bearer token is present it resolves/links the QuizAnalytics
// user and attaches it to the request; otherwise it just calls next(). A
// later requireAuth/requirePermission middleware can read req.authUser once
// routes are ready to start enforcing it.
export function createAuthMiddleware(provider: IAuthProvider, userRepo: IUserRepository): RequestHandler {
    return async (req, _res, next) => {
        const header = req.headers.authorization;
        if (!header?.startsWith("Bearer ")) {
            return next();
        }

        const token = header.slice("Bearer ".length).trim();
        if (!token) return next();

        try {
            const identity = await provider.verify(token);
            if (!identity) return next();

            req.authIdentity = { provider: provider.name, providerUserId: identity.providerUserId, email: identity.email };

            let user = await userRepo.findByAuthProviderUserId(provider.name, identity.providerUserId);

            if (!user && identity.email) {
                const byEmail = await userRepo.findByEmail(identity.email);
                if (byEmail?.id) {
                    await userRepo.linkAuthProviderIdentity(byEmail.id, provider.name, identity.providerUserId);
                    user = await userRepo.findById(byEmail.id);
                }
            }

            if (user?.id) {
                const userId = user.id;
                // First sign-in accepts the invitation. Deliberately not using
                // canTransitionUserStatus here — that would also permit
                // SUSPENDED -> ACTIVE, which must stay an explicit admin action.
                if (user.status === "INVITED") {
                    user = await userRepo.updateStatus(userId, "ACTIVE");
                }
                if (user.status === "ACTIVE") {
                    await userRepo.touchLastLogin(userId);
                }
            }

            req.authUser = user;
        } catch (err) {
            console.error("[authMiddleware]", err);
        }

        next();
    };
}
