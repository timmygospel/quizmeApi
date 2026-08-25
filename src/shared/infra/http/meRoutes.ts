import express from "express";
import { IAuthProvider } from "../auth/IAuthProvider";
import { PgUserRepository } from "../../../modules/users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../modules/roles/infra/db/PgRoleRepository";
import { GetUserEffectiveAccessUseCase } from "../../../modules/users/application/useCases/getUserEffectiveAccess/GetUserEffectiveAccessUseCase";
import { MeController } from "./controllers/MeController";

// GET /api/v1/me — the AUTH-001 Definition of Done item. Relies entirely on
// req.authUser, populated upstream by authMiddleware; this file adds no auth
// enforcement of its own, it just 401s when that middleware found nobody.
export function createMeRoutes(authProvider: IAuthProvider | null) {
    const router = express.Router();

    const useCase = new GetUserEffectiveAccessUseCase(new PgUserRepository(), new PgRoleRepository());
    const controller = new MeController(useCase, authProvider?.capabilities ?? null);

    router.get("/me", (req, res) => controller.execute(req, res));

    return router;
}
