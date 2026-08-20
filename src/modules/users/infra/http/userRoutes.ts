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

const router = express.Router();
const repo = new PgUserRepository();
const roleRepo = new PgRoleRepository();
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

router.get("/users", (req, res) => getAllUsersController.execute(req, res));
router.post("/users/invitations", (req, res) => inviteUserController.execute(req, res));
router.get("/users/:id", (req, res) => getUserController.execute(req, res));
router.post("/users/:id/resend-invitation", (req, res) => resendInvitationController.execute(req, res));
router.post("/users/:id/activate", (req, res) => activateUserController.execute(req, res));
router.post("/users/:id/suspend", (req, res) => suspendUserController.execute(req, res));
router.post("/users/:id/archive", (req, res) => archiveUserController.execute(req, res));
router.get("/users/:id/effective-access", (req, res) => getUserEffectiveAccessController.execute(req, res));
router.post("/users/:id/roles", (req, res) => assignUserRoleController.execute(req, res));
router.delete("/users/:id/roles/:roleId", (req, res) => removeUserRoleController.execute(req, res));

export default router;
