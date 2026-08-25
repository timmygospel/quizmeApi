import express from "express";

import { PgQuestionBankRepository } from "../db/PgQuestionBankRepository";

import { CreateQuestionBankUseCase } from "../../application/useCases/createQuestion/CreateQuestionBankUseCase";
import { GetAllQuestionBankUseCase } from "../../application/useCases/getAllQuestions/GetAllQuestionBankUseCase";
import { UpdateQuestionBankUseCase } from "../../application/useCases/updateQuestion/UpdateQuestionBankUseCase";
import { DeleteQuestionBankUseCase } from "../../application/useCases/deleteQuestion/DeleteQuestionBankUseCase";

import { CreateQuestionBankController } from "./controllers/CreateQuestionBankController";
import { GetAllQuestionBankController } from "./controllers/GetAllQuestionBankController";
import { UpdateQuestionBankController } from "./controllers/UpdateQuestionBankController";
import { DeleteQuestionBankController } from "./controllers/DeleteQuestionBankController";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgQuestionBankRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md §11 pipeline, using the §10 question.* codes.
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

const createUseCase = new CreateQuestionBankUseCase(repo);
const getAllUseCase = new GetAllQuestionBankUseCase(repo);
const updateUseCase = new UpdateQuestionBankUseCase(repo);
const deleteUseCase = new DeleteQuestionBankUseCase(repo);

const createController = new CreateQuestionBankController(createUseCase);
const getAllController = new GetAllQuestionBankController(getAllUseCase);
const updateController = new UpdateQuestionBankController(updateUseCase);
const deleteController = new DeleteQuestionBankController(deleteUseCase);

router.get(
    "/question-bank",
    requireAuthenticatedUser,
    requirePermission("question.read"),
    applyEffectiveScope,
    (req, res) => getAllController.execute(req, res)
);
router.post(
    "/question-bank",
    requireAuthenticatedUser,
    requirePermission("question.create"),
    applyEffectiveScope,
    (req, res) => createController.execute(req, res)
);
router.put(
    "/question-bank/:id",
    requireAuthenticatedUser,
    requirePermission("question.edit"),
    applyEffectiveScope,
    (req, res) => updateController.execute(req, res)
);
router.delete(
    "/question-bank/:id",
    requireAuthenticatedUser,
    requirePermission("question.archive"),
    applyEffectiveScope,
    (req, res) => deleteController.execute(req, res)
);

export default router;
