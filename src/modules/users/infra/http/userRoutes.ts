import express from "express";

import { PgUserRepository } from "../db/PgUserRepository";
import { GetAllUsersUseCase } from "../../application/useCases/getAllUsers/GetAllUsersUseCase";
import { GetUserUseCase } from "../../application/useCases/getUser/GetUserUseCase";
import { GetAllUsersController } from "./controllers/GetAllUsersController";
import { GetUserController } from "./controllers/GetUserController";

const router = express.Router();
const repo = new PgUserRepository();

const getAllUsersUseCase = new GetAllUsersUseCase(repo);
const getUserUseCase = new GetUserUseCase(repo);

const getAllUsersController = new GetAllUsersController(getAllUsersUseCase);
const getUserController = new GetUserController(getUserUseCase);

router.get("/users", (req, res) => getAllUsersController.execute(req, res));
router.get("/users/:id", (req, res) => getUserController.execute(req, res));

export default router;
