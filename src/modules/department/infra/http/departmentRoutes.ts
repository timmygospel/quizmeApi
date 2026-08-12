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

const router = express.Router();
const repo = new PgDepartmentRepository();

const createDepartmentUseCase = new CreateDepartmentUseCase(repo);
const getAllDepartmentsUseCase = new GetAllDepartmentsUseCase(repo);
const updateDepartmentUseCase = new UpdateDepartmentUseCase(repo);
const deleteDepartmentUseCase = new DeleteDepartmentUseCase(repo);

const createDepartmentController = new CreateDepartmentController(createDepartmentUseCase);
const getAllDepartmentsController = new GetAllDepartmentsController(getAllDepartmentsUseCase);
const updateDepartmentController = new UpdateDepartmentController(updateDepartmentUseCase);
const deleteDepartmentController = new DeleteDepartmentController(deleteDepartmentUseCase);

router.get("/departments", (req, res) => getAllDepartmentsController.execute(req, res));
router.post("/departments", (req, res) => createDepartmentController.execute(req, res));
router.put("/departments/:id", (req, res) => updateDepartmentController.execute(req, res));
router.delete("/departments/:id", (req, res) => deleteDepartmentController.execute(req, res));

export default router;
