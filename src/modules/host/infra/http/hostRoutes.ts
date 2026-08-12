import express from "express";

import { PgHostRepository } from "../db/PgHostRepository";
import { CreateHostUseCase } from "../../application/useCases/createHost/CreateHostUseCase";
import { GetAllHostsUseCase } from "../../application/useCases/getAllHosts/GetAllHostsUseCase";
import { CreateHostController } from "./controllers/CreateHostController";
import { GetAllHostsController } from "./controllers/GetAllHostsController";

const router = express.Router();
const repo = new PgHostRepository();

const createHostUseCase = new CreateHostUseCase(repo);
const getAllHostsUseCase = new GetAllHostsUseCase(repo);

const createHostController = new CreateHostController(createHostUseCase);
const getAllHostsController = new GetAllHostsController(getAllHostsUseCase);

router.get("/hosts", (req, res) => getAllHostsController.execute(req, res));
router.post("/hosts", (req, res) => createHostController.execute(req, res));

export default router;
