import express, { Router } from "express";

import { PgQuizRepository } from "../db/PgQuizRepository";
// ✅ Use Cases

import { CreateQuizUseCase } from "../../application/useCases/createQuiz/CreateQuizUseCase";
import { UpdateQuizUseCase } from "../../application/useCases/updateQuiz/UpdateQuizUseCase";

import { DeleteQuizUseCase } from "../../application/useCases/deleteQuiz/DeleteQuizUseCase";
import { GetQuizUseCase } from "../../application/useCases/getQuiz/GetQuizUseCase";


import { GetAllQuizzesUseCase } from "../../application/useCases/getAllQuizzes/GetAllQuizzesUseCase";
import { GetSectionQuestionsUseCase } from "../../application/useCases/getSectionQuestions/GetSectionQuestionsUseCase";
// ✅ Controllers
import { CreateQuizController } from "./controllers/CreateQuizController";
import { UpdateQuizController } from "./controllers/UpdateQuizController";
import { DeleteQuizController } from "./controllers/DeleteQuizController";
import { GetQuizController } from "./controllers/GetQuizController";
import { GetAllQuizzesController } from "./controllers/GetAllQuizzesController";
import { GetSectionQuestionsController } from "./controllers/GetSectionQuestionsController";
import { IQuizRepository } from "../../domain/IQuizRepository";
import { IUserRepository } from "../../../users/domain/IUserRepository";
import { IRoleRepository } from "../../../roles/domain/IRoleRepository";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

export interface QuizRouterDeps {
    quizRepo: IQuizRepository;
    userRepo: IUserRepository;
    roleRepo: IRoleRepository;
}

// PERMISSIONS.md §11 pipeline. Quiz rows are this codebase's "training
// template" entity (see CLAUDE.md — sessions.template_id references
// quizzes(id)), so they're gated with the §10 template.* codes rather than
// question.* (that's questionBankRoutes.ts) or assessment.* (no assessment
// module exists yet). DELETE has no dedicated §10 code; template.archive is
// the closest lifecycle-ending permission.
export function createQuizRouter({ quizRepo: repo, userRepo, roleRepo }: QuizRouterDeps): Router {
    const router = express.Router();
    const requirePermission = createRequirePermission(userRepo, roleRepo);
    const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

    // Instantiate use cases
    const createQuizUseCase = new CreateQuizUseCase(repo);
    const updateQuizUseCase = new UpdateQuizUseCase(repo);
    const deleteQuizUseCase = new DeleteQuizUseCase(repo);
    const getQuizUseCase = new GetQuizUseCase(repo);
    const getAllQuizzesUseCase = new GetAllQuizzesUseCase(repo);
    const getSectionQuestionsUseCase = new GetSectionQuestionsUseCase(repo);

    // Instantiate controllers
    const createQuizController = new CreateQuizController(createQuizUseCase);
    const updateQuizController = new UpdateQuizController(updateQuizUseCase);
    const deleteQuizController = new DeleteQuizController(deleteQuizUseCase);
    const getQuizController = new GetQuizController(getQuizUseCase);
    const getAllQuizzesController = new GetAllQuizzesController(getAllQuizzesUseCase);
    const getSectionQuestionsController = new GetSectionQuestionsController(getSectionQuestionsUseCase);

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
    // Section-scoped lookup — the questions for a knowledge check at one point of a course.
    router.get(
        "/quizzes/:id/sections/:sectionId/questions",
        requireAuthenticatedUser,
        requirePermission("template.read"),
        applyEffectiveScope,
        (req, res) => getSectionQuestionsController.execute(req, res)
    );
    router.get(
        "/quizzes",
        requireAuthenticatedUser,
        requirePermission("template.read"),
        applyEffectiveScope,
        (req, res) => getAllQuizzesController.execute(req, res)
    );

    return router;
}

export default createQuizRouter({
    quizRepo: new PgQuizRepository(),
    userRepo: new PgUserRepository(),
    roleRepo: new PgRoleRepository(),
});
