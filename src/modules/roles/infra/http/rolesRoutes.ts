import express from "express";

import { PgRoleRepository } from "../db/PgRoleRepository";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { GetAllRolesUseCase } from "../../application/useCases/getAllRoles/GetAllRolesUseCase";
import { GetRoleUseCase } from "../../application/useCases/getRole/GetRoleUseCase";
import { CreateRoleUseCase } from "../../application/useCases/createRole/CreateRoleUseCase";
import { UpdateRoleUseCase } from "../../application/useCases/updateRole/UpdateRoleUseCase";
import { ArchiveRoleUseCase } from "../../application/useCases/archiveRole/ArchiveRoleUseCase";
import { GetAllPermissionsUseCase } from "../../application/useCases/getAllPermissions/GetAllPermissionsUseCase";
import { GetRolePermissionsUseCase } from "../../application/useCases/getRolePermissions/GetRolePermissionsUseCase";
import { SetRolePermissionsUseCase } from "../../application/useCases/setRolePermissions/SetRolePermissionsUseCase";
import { GetAllRolesController } from "./controllers/GetAllRolesController";
import { GetRoleController } from "./controllers/GetRoleController";
import { CreateRoleController } from "./controllers/CreateRoleController";
import { UpdateRoleController } from "./controllers/UpdateRoleController";
import { ArchiveRoleController } from "./controllers/ArchiveRoleController";
import { GetAllPermissionsController } from "./controllers/GetAllPermissionsController";
import { GetRolePermissionsController } from "./controllers/GetRolePermissionsController";
import { SetRolePermissionsController } from "./controllers/SetRolePermissionsController";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgRoleRepository();
const userRepo = new PgUserRepository();

// PERMISSIONS.md §11 pipeline — see userRoutes.ts for the same wiring.
const requirePermission = createRequirePermission(userRepo, repo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, repo);

const getAllRolesUseCase = new GetAllRolesUseCase(repo);
const getRoleUseCase = new GetRoleUseCase(repo);
const createRoleUseCase = new CreateRoleUseCase(repo);
const updateRoleUseCase = new UpdateRoleUseCase(repo);
const archiveRoleUseCase = new ArchiveRoleUseCase(repo);
const getAllPermissionsUseCase = new GetAllPermissionsUseCase(repo);
const getRolePermissionsUseCase = new GetRolePermissionsUseCase(repo);
const setRolePermissionsUseCase = new SetRolePermissionsUseCase(repo);

const getAllRolesController = new GetAllRolesController(getAllRolesUseCase);
const getRoleController = new GetRoleController(getRoleUseCase);
const createRoleController = new CreateRoleController(createRoleUseCase);
const updateRoleController = new UpdateRoleController(updateRoleUseCase);
const archiveRoleController = new ArchiveRoleController(archiveRoleUseCase);
const getAllPermissionsController = new GetAllPermissionsController(getAllPermissionsUseCase);
const getRolePermissionsController = new GetRolePermissionsController(getRolePermissionsUseCase);
const setRolePermissionsController = new SetRolePermissionsController(setRolePermissionsUseCase);

router.get(
    "/permissions",
    requireAuthenticatedUser,
    requirePermission("role.read"),
    applyEffectiveScope,
    (req, res) => getAllPermissionsController.execute(req, res)
);

router.get(
    "/roles",
    requireAuthenticatedUser,
    requirePermission("role.read"),
    applyEffectiveScope,
    (req, res) => getAllRolesController.execute(req, res)
);
router.post(
    "/roles",
    requireAuthenticatedUser,
    requirePermission("role.create"),
    applyEffectiveScope,
    (req, res) => createRoleController.execute(req, res)
);
router.get(
    "/roles/:id",
    requireAuthenticatedUser,
    requirePermission("role.read"),
    applyEffectiveScope,
    (req, res) => getRoleController.execute(req, res)
);
router.patch(
    "/roles/:id",
    requireAuthenticatedUser,
    requirePermission("role.edit"),
    applyEffectiveScope,
    (req, res) => updateRoleController.execute(req, res)
);
router.post(
    "/roles/:id/archive",
    requireAuthenticatedUser,
    requirePermission("role.archive"),
    applyEffectiveScope,
    (req, res) => archiveRoleController.execute(req, res)
);
router.get(
    "/roles/:id/permissions",
    requireAuthenticatedUser,
    requirePermission("role.read"),
    applyEffectiveScope,
    (req, res) => getRolePermissionsController.execute(req, res)
);
router.put(
    "/roles/:id/permissions",
    requireAuthenticatedUser,
    requirePermission("role.edit"),
    applyEffectiveScope,
    (req, res) => setRolePermissionsController.execute(req, res)
);

export default router;
