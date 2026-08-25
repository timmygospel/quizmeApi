import express from "express";

import { PgHostRepository } from "../db/PgHostRepository";
import { CreateHostUseCase } from "../../application/useCases/createHost/CreateHostUseCase";
import { GetAllHostsUseCase } from "../../application/useCases/getAllHosts/GetAllHostsUseCase";
import { CreateHostController } from "./controllers/CreateHostController";
import { GetAllHostsController } from "./controllers/GetAllHostsController";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgHostRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

const createHostUseCase = new CreateHostUseCase(repo);
const getAllHostsUseCase = new GetAllHostsUseCase(repo);

const createHostController = new CreateHostController(createHostUseCase);
const getAllHostsController = new GetAllHostsController(getAllHostsUseCase);

// PERMISSIONS.md §11 pipeline. Hosts are a lookup list feeding the Session
// wizard's Delivery step (CLAUDE.md), gated with the §10 session.* codes.
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

router.get(
    "/hosts",
    requireAuthenticatedUser,
    requirePermission("session.read"),
    applyEffectiveScope,
    (req, res) => getAllHostsController.execute(req, res)
);
router.post(
    "/hosts",
    requireAuthenticatedUser,
    requirePermission("session.manage"),
    applyEffectiveScope,
    (req, res) => createHostController.execute(req, res)
);

export default router;
