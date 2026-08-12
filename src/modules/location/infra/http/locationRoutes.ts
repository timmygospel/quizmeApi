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

const router = express.Router();
const repo = new PgLocationRepository();

const createLocationUseCase = new CreateLocationUseCase(repo);
const getAllLocationsUseCase = new GetAllLocationsUseCase(repo);
const updateLocationUseCase = new UpdateLocationUseCase(repo);
const deleteLocationUseCase = new DeleteLocationUseCase(repo);

const createLocationController = new CreateLocationController(createLocationUseCase);
const getAllLocationsController = new GetAllLocationsController(getAllLocationsUseCase);
const updateLocationController = new UpdateLocationController(updateLocationUseCase);
const deleteLocationController = new DeleteLocationController(deleteLocationUseCase);

router.get("/locations", (req, res) => getAllLocationsController.execute(req, res));
router.post("/locations", (req, res) => createLocationController.execute(req, res));
router.put("/locations/:id", (req, res) => updateLocationController.execute(req, res));
router.delete("/locations/:id", (req, res) => deleteLocationController.execute(req, res));

export default router;
