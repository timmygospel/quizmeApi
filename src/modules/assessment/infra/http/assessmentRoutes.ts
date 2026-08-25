import express from "express";

import { PgAssessmentRepository } from "../db/PgAssessmentRepository";
import { CreateAssessmentUseCase } from "../../application/useCases/createAssessment/CreateAssessmentUseCase";
import { GetAllAssessmentsUseCase } from "../../application/useCases/getAllAssessments/GetAllAssessmentsUseCase";
import { GetAssessmentUseCase } from "../../application/useCases/getAssessment/GetAssessmentUseCase";
import { UpdateAssessmentUseCase } from "../../application/useCases/updateAssessment/UpdateAssessmentUseCase";
import { DuplicateAssessmentUseCase } from "../../application/useCases/duplicateAssessment/DuplicateAssessmentUseCase";
import { ArchiveAssessmentUseCase } from "../../application/useCases/archiveAssessment/ArchiveAssessmentUseCase";
import { CreateAssessmentController } from "./controllers/CreateAssessmentController";
import { GetAllAssessmentsController } from "./controllers/GetAllAssessmentsController";
import { GetAssessmentController } from "./controllers/GetAssessmentController";
import { UpdateAssessmentController } from "./controllers/UpdateAssessmentController";
import { DuplicateAssessmentController } from "./controllers/DuplicateAssessmentController";
import { ArchiveAssessmentController } from "./controllers/ArchiveAssessmentController";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgAssessmentRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md (AUTH-002) §10/§11 pipeline, gated with the assessment.*
// codes that are already seeded in schema.sql and granted to Organisation
// Admin + Content Creator.
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);

const getAllAssessmentsUseCase = new GetAllAssessmentsUseCase(repo);
const getAssessmentUseCase = new GetAssessmentUseCase(repo);
const createAssessmentUseCase = new CreateAssessmentUseCase(repo);
const updateAssessmentUseCase = new UpdateAssessmentUseCase(repo);
const duplicateAssessmentUseCase = new DuplicateAssessmentUseCase(repo);
const archiveAssessmentUseCase = new ArchiveAssessmentUseCase(repo);

const getAllAssessmentsController = new GetAllAssessmentsController(getAllAssessmentsUseCase);
const getAssessmentController = new GetAssessmentController(getAssessmentUseCase);
const createAssessmentController = new CreateAssessmentController(createAssessmentUseCase);
const updateAssessmentController = new UpdateAssessmentController(updateAssessmentUseCase);
const duplicateAssessmentController = new DuplicateAssessmentController(duplicateAssessmentUseCase);
const archiveAssessmentController = new ArchiveAssessmentController(archiveAssessmentUseCase);

router.get(
    "/assessments",
    requireAuthenticatedUser,
    requirePermission("assessment.read"),
    applyEffectiveScope,
    (req, res) => getAllAssessmentsController.execute(req, res)
);
router.post(
    "/assessments",
    requireAuthenticatedUser,
    requirePermission("assessment.create"),
    applyEffectiveScope,
    (req, res) => createAssessmentController.execute(req, res)
);
router.get(
    "/assessments/:id",
    requireAuthenticatedUser,
    requirePermission("assessment.read"),
    applyEffectiveScope,
    (req, res) => getAssessmentController.execute(req, res)
);
router.put(
    "/assessments/:id",
    requireAuthenticatedUser,
    requirePermission("assessment.edit"),
    applyEffectiveScope,
    (req, res) => updateAssessmentController.execute(req, res)
);
router.post(
    "/assessments/:id/duplicate",
    requireAuthenticatedUser,
    requirePermission("assessment.create"),
    applyEffectiveScope,
    (req, res) => duplicateAssessmentController.execute(req, res)
);
router.post(
    "/assessments/:id/archive",
    requireAuthenticatedUser,
    requirePermission("assessment.archive"),
    applyEffectiveScope,
    (req, res) => archiveAssessmentController.execute(req, res)
);

export default router;
