import express from "express";


import { PgCategoryRepository } from "../../db/PgCategoryRepository";
import { CreateCategoryUseCase } from "../../../application/useCases/createCategory/CreateCategoryUseCase";
// import { GetAllCategoriesUseCase } from "../../application/useCases/getAllCategories/GetAllCategoriesUseCase";
import { GetAllCategoriesUseCase } from "../../../application/useCases/getAllCategories/GetAllCategoriesUseCase";
// import { DeleteCategoryUseCase } from "../../application/useCases/deleteCategory/DeleteCategoryUseCase";
import { DeleteCategoryUseCase } from "../../../application/useCases/deleteCategory/DeleteCategoryUseCase";
// import { CreateCategoryController } from "./controllers/CreateCategoryController";
import { CreateCategoryController } from "./CreateCategoryController";
// import { GetAllCategoriesController } from "./controllers/GetAllCategoriesController";
import { GetAllCategoriesController } from "./GetAllCategoriesController";
// import { DeleteCategoryController } from "./controllers/DeleteCategoryController";
import { DeleteCategoryController } from "./DeleteCategoryController";
// import { UpdateCategoryUseCase } from "../../application/useCases/updateCategory/UpdateCategoryUseCase";
import { UpdateCategoryUseCase } from "../../../application/useCases/updateCategory/UpdateCategoryUseCase";
// import { UpdateCategoryController } from "./controllers/UpdateCategoryController";
import { UpdateCategoryController } from "./UpdateCategoryController";
import { PgUserRepository } from "../../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgCategoryRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md §11 pipeline. No dedicated §10 code for categories (a
// content taxonomy shared by quizzes/question bank) — gated with template.*
// since they're primarily used to organise training templates.
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

const createCategoryUseCase = new CreateCategoryUseCase(repo);
const getAllCategoriesUseCase = new GetAllCategoriesUseCase(repo);
const deleteCategoryUseCase = new DeleteCategoryUseCase(repo);
const updateCategoryUseCase = new UpdateCategoryUseCase(repo);
const updateCategoryController = new UpdateCategoryController(updateCategoryUseCase);

const createCategoryController = new CreateCategoryController(createCategoryUseCase);
const getAllCategoriesController = new GetAllCategoriesController(getAllCategoriesUseCase);
const deleteCategoryController = new DeleteCategoryController(deleteCategoryUseCase);

router.get(
    "/categories",
    requireAuthenticatedUser,
    requirePermission("template.read"),
    applyEffectiveScope,
    (req, res) => getAllCategoriesController.execute(req, res)
);
router.post(
    "/categories",
    requireAuthenticatedUser,
    requirePermission("template.edit"),
    applyEffectiveScope,
    (req, res) => createCategoryController.execute(req, res)
);
router.put(
    "/categories/:id",
    requireAuthenticatedUser,
    requirePermission("template.edit"),
    applyEffectiveScope,
    (req, res) => updateCategoryController.execute(req, res)
);
router.delete(
    "/categories/:id",
    requireAuthenticatedUser,
    requirePermission("template.edit"),
    applyEffectiveScope,
    (req, res) => deleteCategoryController.execute(req, res)
);

export default router;
