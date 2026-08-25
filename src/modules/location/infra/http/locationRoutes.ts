import express from "express";

import { PgLocationRepository } from "../db/PgLocationRepository";
import { CreateLocationUseCase } from "../../application/useCases/createLocation/CreateLocationUseCase";
import { GetAllLocationsUseCase } from "../../application/useCases/getAllLocations/GetAllLocationsUseCase";
import { UpdateLocationUseCase } from "../../application/useCases/updateLocation/UpdateLocationUseCase";
import { DeleteLocationUseCase } from "../../application/useCases/deleteLocation/DeleteLocationUseCase";
import { CreateLocationController } from "./controllers/CreateLocationController";
import { GetAllLocationsController } from "./controllers/GetAllLocationsController";
import { UpdateLocationController } from "./controllers/UpdateLocationController";
import { DeleteLocationController } from "./controllers/DeleteLocationController";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgLocationRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md §11 pipeline — see departmentRoutes.ts for why settings.*.
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

const createLocationUseCase = new CreateLocationUseCase(repo);
const getAllLocationsUseCase = new GetAllLocationsUseCase(repo);
const updateLocationUseCase = new UpdateLocationUseCase(repo);
const deleteLocationUseCase = new DeleteLocationUseCase(repo);

const createLocationController = new CreateLocationController(createLocationUseCase);
const getAllLocationsController = new GetAllLocationsController(getAllLocationsUseCase);
const updateLocationController = new UpdateLocationController(updateLocationUseCase);
const deleteLocationController = new DeleteLocationController(deleteLocationUseCase);

router.get(
    "/locations",
    requireAuthenticatedUser,
    requirePermission("settings.read"),
    applyEffectiveScope,
    (req, res) => getAllLocationsController.execute(req, res)
);
router.post(
    "/locations",
    requireAuthenticatedUser,
    requirePermission("settings.manage"),
    applyEffectiveScope,
    (req, res) => createLocationController.execute(req, res)
);
router.put(
    "/locations/:id",
    requireAuthenticatedUser,
    requirePermission("settings.manage"),
    applyEffectiveScope,
    (req, res) => updateLocationController.execute(req, res)
);
router.delete(
    "/locations/:id",
    requireAuthenticatedUser,
    requirePermission("settings.manage"),
    applyEffectiveScope,
    (req, res) => deleteLocationController.execute(req, res)
);

export default router;
