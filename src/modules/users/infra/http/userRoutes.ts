import express from "express";

import { PgUserRepository } from "../db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import { PgDepartmentRepository } from "../../../department/infra/db/PgDepartmentRepository";
import { PgLocationRepository } from "../../../location/infra/db/PgLocationRepository";
import { GetAllUsersUseCase } from "../../application/useCases/getAllUsers/GetAllUsersUseCase";
import { GetUserUseCase } from "../../application/useCases/getUser/GetUserUseCase";
import { InviteUserUseCase } from "../../application/useCases/inviteUser/InviteUserUseCase";
import { ResendInvitationUseCase } from "../../application/useCases/resendInvitation/ResendInvitationUseCase";
import { ActivateUserUseCase } from "../../application/useCases/activateUser/ActivateUserUseCase";
import { SuspendUserUseCase } from "../../application/useCases/suspendUser/SuspendUserUseCase";
import { ArchiveUserUseCase } from "../../application/useCases/archiveUser/ArchiveUserUseCase";
import { AssignUserRoleUseCase } from "../../application/useCases/assignUserRole/AssignUserRoleUseCase";
import { RemoveUserRoleUseCase } from "../../application/useCases/removeUserRole/RemoveUserRoleUseCase";
import { GetUserEffectiveAccessUseCase } from "../../application/useCases/getUserEffectiveAccess/GetUserEffectiveAccessUseCase";
import { GetAllUsersController } from "./controllers/GetAllUsersController";
import { GetUserController } from "./controllers/GetUserController";
import { InviteUserController } from "./controllers/InviteUserController";
import { ResendInvitationController } from "./controllers/ResendInvitationController";
import { ActivateUserController } from "./controllers/ActivateUserController";
import { SuspendUserController } from "./controllers/SuspendUserController";
import { ArchiveUserController } from "./controllers/ArchiveUserController";
import { AssignUserRoleController } from "./controllers/AssignUserRoleController";
import { RemoveUserRoleController } from "./controllers/RemoveUserRoleController";
import { GetUserEffectiveAccessController } from "./controllers/GetUserEffectiveAccessController";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgUserRepository();
const roleRepo = new PgRoleRepository();

// PERMISSIONS.md §11 pipeline: requireAuthenticatedUser -> requirePermission
// -> applyEffectiveScope -> controller. Permission codes are the §10
// catalogue; resource-by-ID scope verification (e.g. "is :id within my
// effective scope") is not yet enforced here — applyEffectiveScope only
// resolves req.effectiveScope for a controller/use case to apply.
const requirePermission = createRequirePermission(repo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(repo, roleRepo);
const departmentRepo = new PgDepartmentRepository();
const locationRepo = new PgLocationRepository();

const getAllUsersUseCase = new GetAllUsersUseCase(repo);
const getUserUseCase = new GetUserUseCase(repo);
const inviteUserUseCase = new InviteUserUseCase(repo, roleRepo, departmentRepo, locationRepo);
const resendInvitationUseCase = new ResendInvitationUseCase(repo);
const activateUserUseCase = new ActivateUserUseCase(repo);
const suspendUserUseCase = new SuspendUserUseCase(repo);
const archiveUserUseCase = new ArchiveUserUseCase(repo);
const assignUserRoleUseCase = new AssignUserRoleUseCase(repo, roleRepo, departmentRepo, locationRepo);
const removeUserRoleUseCase = new RemoveUserRoleUseCase(repo, roleRepo);
const getUserEffectiveAccessUseCase = new GetUserEffectiveAccessUseCase(repo, roleRepo);

const getAllUsersController = new GetAllUsersController(getAllUsersUseCase);
const getUserController = new GetUserController(getUserUseCase);
const inviteUserController = new InviteUserController(inviteUserUseCase);
const resendInvitationController = new ResendInvitationController(resendInvitationUseCase);
const activateUserController = new ActivateUserController(activateUserUseCase);
const suspendUserController = new SuspendUserController(suspendUserUseCase);
const archiveUserController = new ArchiveUserController(archiveUserUseCase);
const assignUserRoleController = new AssignUserRoleController(assignUserRoleUseCase);
const removeUserRoleController = new RemoveUserRoleController(removeUserRoleUseCase);
const getUserEffectiveAccessController = new GetUserEffectiveAccessController(getUserEffectiveAccessUseCase);

router.get(
    "/users",
    requireAuthenticatedUser,
    requirePermission("user.read"),
    applyEffectiveScope,
    (req, res) => getAllUsersController.execute(req, res)
);
router.post(
    "/users/invitations",
    requireAuthenticatedUser,
    requirePermission("user.invite"),
    applyEffectiveScope,
    (req, res) => inviteUserController.execute(req, res)
);
router.get(
    "/users/:id",
    requireAuthenticatedUser,
    requirePermission("user.read"),
    applyEffectiveScope,
    (req, res) => getUserController.execute(req, res)
);
router.post(
    "/users/:id/resend-invitation",
    requireAuthenticatedUser,
    requirePermission("user.invite"),
    applyEffectiveScope,
    (req, res) => resendInvitationController.execute(req, res)
);
router.post(
    "/users/:id/activate",
    requireAuthenticatedUser,
    requirePermission("user.edit"),
    applyEffectiveScope,
    (req, res) => activateUserController.execute(req, res)
);
router.post(
    "/users/:id/suspend",
    requireAuthenticatedUser,
    requirePermission("user.suspend"),
    applyEffectiveScope,
    (req, res) => suspendUserController.execute(req, res)
);
router.post(
    "/users/:id/archive",
    requireAuthenticatedUser,
    requirePermission("user.archive"),
    applyEffectiveScope,
    (req, res) => archiveUserController.execute(req, res)
);
router.get(
    "/users/:id/effective-access",
    requireAuthenticatedUser,
    requirePermission("user.read"),
    applyEffectiveScope,
    (req, res) => getUserEffectiveAccessController.execute(req, res)
);
router.post(
    "/users/:id/roles",
    requireAuthenticatedUser,
    requirePermission("role.assign"),
    applyEffectiveScope,
    (req, res) => assignUserRoleController.execute(req, res)
);
router.delete(
    "/users/:id/roles/:roleId",
    requireAuthenticatedUser,
    requirePermission("role.assign"),
    applyEffectiveScope,
    (req, res) => removeUserRoleController.execute(req, res)
);

export default router;
