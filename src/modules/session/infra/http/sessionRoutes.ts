import express from "express";

import { PgSessionRepository } from "../db/PgSessionRepository";
import { PgQuizRepository } from "../../../quiz/infra/db/PgQuizRepository";
import { CreateSessionUseCase } from "../../application/useCases/createSession/CreateSessionUseCase";
import { GetAllSessionsUseCase } from "../../application/useCases/getAllSessions/GetAllSessionsUseCase";
import { GetSessionUseCase } from "../../application/useCases/getSession/GetSessionUseCase";
import { CreateSessionController } from "./controllers/CreateSessionController";
import { GetAllSessionsController } from "./controllers/GetAllSessionsController";
import { GetSessionController } from "./controllers/GetSessionController";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const sessionRepo = new PgSessionRepository();
const quizRepo = new PgQuizRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md §11 pipeline, using the §10 session.* codes.
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

const createSessionUseCase = new CreateSessionUseCase(sessionRepo, quizRepo);
const getAllSessionsUseCase = new GetAllSessionsUseCase(sessionRepo);
const getSessionUseCase = new GetSessionUseCase(sessionRepo);

const createSessionController = new CreateSessionController(createSessionUseCase);
const getAllSessionsController = new GetAllSessionsController(getAllSessionsUseCase);
const getSessionController = new GetSessionController(getSessionUseCase);

router.post(
    "/sessions",
    requireAuthenticatedUser,
    requirePermission("session.create"),
    applyEffectiveScope,
    (req, res) => createSessionController.execute(req, res)
);
router.get(
    "/sessions",
    requireAuthenticatedUser,
    requirePermission("session.read"),
    applyEffectiveScope,
    (req, res) => getAllSessionsController.execute(req, res)
);
router.get(
    "/sessions/:id",
    requireAuthenticatedUser,
    requirePermission("session.read"),
    applyEffectiveScope,
    (req, res) => getSessionController.execute(req, res)
);

export default router;
