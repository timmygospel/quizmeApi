import express from "express";

import { PgQuizRepository } from "../db/PgQuizRepository";
// ✅ Use Cases

import { CreateQuizUseCase } from "../../application/useCases/createQuiz/CreateQuizUseCase";
import { UpdateQuizUseCase } from "../../application/useCases/updateQuiz/UpdateQuizUseCase";

import { DeleteQuizUseCase } from "../../application/useCases/deleteQuiz/DeleteQuizUseCase";
import { GetQuizUseCase } from "../../application/useCases/getQuiz/GetQuizUseCase";


import { GetAllQuizzesUseCase } from "../../application/useCases/getAllQuizzes/GetAllQuizzesUseCase";
// ✅ Controllers
import { CreateQuizController } from "./controllers/CreateQuizController";
import { UpdateQuizController } from "./controllers/UpdateQuizController";
import { DeleteQuizController } from "./controllers/DeleteQuizController";
import { GetQuizController } from "./controllers/GetQuizController";
import { GetAllQuizzesController } from "./controllers/GetAllQuizzesController";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgQuizRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md §11 pipeline. Quiz rows are this codebase's "training
// template" entity (see CLAUDE.md — sessions.template_id references
// quizzes(id)), so they're gated with the §10 template.* codes rather than
// question.* (that's questionBankRoutes.ts) or assessment.* (no assessment
// module exists yet). DELETE has no dedicated §10 code; template.archive is
// the closest lifecycle-ending permission.
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

// Instantiate use cases
const createQuizUseCase = new CreateQuizUseCase(repo);
const updateQuizUseCase = new UpdateQuizUseCase(repo);
const deleteQuizUseCase = new DeleteQuizUseCase(repo);
const getQuizUseCase = new GetQuizUseCase(repo);
const getAllQuizzesUseCase = new GetAllQuizzesUseCase(repo);

// Instantiate controllers
const createQuizController = new CreateQuizController(createQuizUseCase);
const updateQuizController = new UpdateQuizController(updateQuizUseCase);
const deleteQuizController = new DeleteQuizController(deleteQuizUseCase);
const getQuizController = new GetQuizController(getQuizUseCase);
const getAllQuizzesController = new GetAllQuizzesController(getAllQuizzesUseCase);

// ✅ Routes
router.post(
    "/quizzes",
    requireAuthenticatedUser,
    requirePermission("template.create"),
    applyEffectiveScope,
    (req, res) => createQuizController.execute(req, res)
);
router.put(
    "/quizzes/:id",
    requireAuthenticatedUser,
    requirePermission("template.edit"),
    applyEffectiveScope,
    (req, res) => updateQuizController.execute(req, res)
);
router.delete(
    "/quizzes/:id",
    requireAuthenticatedUser,
    requirePermission("template.archive"),
    applyEffectiveScope,
    (req, res) => deleteQuizController.execute(req, res)
);
router.get(
    "/quizzes/:id",
    requireAuthenticatedUser,
    requirePermission("template.read"),
    applyEffectiveScope,
    (req, res) => getQuizController.execute(req, res)
);
router.get(
    "/quizzes",
    requireAuthenticatedUser,
    requirePermission("template.read"),
    applyEffectiveScope,
    (req, res) => getAllQuizzesController.execute(req, res)
);

export default router;
