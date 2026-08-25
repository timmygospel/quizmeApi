import express from "express";

import { PgDepartmentRepository } from "../db/PgDepartmentRepository";
import { CreateDepartmentUseCase } from "../../application/useCases/createDepartment/CreateDepartmentUseCase";
import { GetAllDepartmentsUseCase } from "../../application/useCases/getAllDepartments/GetAllDepartmentsUseCase";
import { UpdateDepartmentUseCase } from "../../application/useCases/updateDepartment/UpdateDepartmentUseCase";
import { DeleteDepartmentUseCase } from "../../application/useCases/deleteDepartment/DeleteDepartmentUseCase";
import { CreateDepartmentController } from "./controllers/CreateDepartmentController";
import { GetAllDepartmentsController } from "./controllers/GetAllDepartmentsController";
import { UpdateDepartmentController } from "./controllers/UpdateDepartmentController";
import { DeleteDepartmentController } from "./controllers/DeleteDepartmentController";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgDepartmentRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md §11 pipeline. Departments are organisational structure
// (§3's Organisation -> Location -> Department hierarchy), gated with the
// §10 settings.* codes rather than a dedicated department.* code (none
// exists in the catalogue).
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

const createDepartmentUseCase = new CreateDepartmentUseCase(repo);
const getAllDepartmentsUseCase = new GetAllDepartmentsUseCase(repo);
const updateDepartmentUseCase = new UpdateDepartmentUseCase(repo);
const deleteDepartmentUseCase = new DeleteDepartmentUseCase(repo);

const createDepartmentController = new CreateDepartmentController(createDepartmentUseCase);
const getAllDepartmentsController = new GetAllDepartmentsController(getAllDepartmentsUseCase);
const updateDepartmentController = new UpdateDepartmentController(updateDepartmentUseCase);
const deleteDepartmentController = new DeleteDepartmentController(deleteDepartmentUseCase);

router.get(
    "/departments",
    requireAuthenticatedUser,
    requirePermission("settings.read"),
    applyEffectiveScope,
    (req, res) => getAllDepartmentsController.execute(req, res)
);
router.post(
    "/departments",
    requireAuthenticatedUser,
    requirePermission("settings.manage"),
    applyEffectiveScope,
    (req, res) => createDepartmentController.execute(req, res)
);
router.put(
    "/departments/:id",
    requireAuthenticatedUser,
    requirePermission("settings.manage"),
    applyEffectiveScope,
    (req, res) => updateDepartmentController.execute(req, res)
);
router.delete(
    "/departments/:id",
    requireAuthenticatedUser,
    requirePermission("settings.manage"),
    applyEffectiveScope,
    (req, res) => deleteDepartmentController.execute(req, res)
);

export default router;
