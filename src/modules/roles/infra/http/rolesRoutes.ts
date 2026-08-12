import express from "express";

import { PgRoleRepository } from "../db/PgRoleRepository";
import { GetAllRolesUseCase } from "../../application/useCases/getAllRoles/GetAllRolesUseCase";
import { GetAllRolesController } from "./controllers/GetAllRolesController";

const router = express.Router();
const repo = new PgRoleRepository();

const getAllRolesUseCase = new GetAllRolesUseCase(repo);

const getAllRolesController = new GetAllRolesController(getAllRolesUseCase);

router.get("/roles", (req, res) => getAllRolesController.execute(req, res));

export default router;
