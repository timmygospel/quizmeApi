import express, { Request } from "express";
import { PgTrainingEventRepository } from "../db/PgTrainingEventRepository";
import { PgQuizRepository } from "../../../quiz/infra/db/PgQuizRepository";
import { PgUserRepository } from "../../../users/infra/db/PgUserRepository";
import { PgRoleRepository } from "../../../roles/infra/db/PgRoleRepository";
import {
    CloseCheckUseCase,
    CreateTrainingEventUseCase,
    EndTrainingEventUseCase,
    GetTrainingEventResultsUseCase,
    GetTrainingEventUseCase,
    ListTrainingEventsUseCase,
    MergeAttendeesUseCase,
    OpenCheckUseCase,
} from "../../application/trainerUseCases";
import {
    GetCurrentActivityUseCase,
    GetEventForAttendeeUseCase,
    JoinAsGuestUseCase,
    ListGuestsUseCase,
    RejoinAsGuestUseCase,
    SaveCheckAnswerUseCase,
    SubmitCheckUseCase,
} from "../../application/attendeeUseCases";
import { UseCaseController } from "./UseCaseController";
import { getIO } from "../../../../socket";
import { createSocketTrainingEventNotifier } from "../../../../socket/trainingEventHandlers";
import {
    requireAuthenticatedUser,
    createRequirePermission,
    createApplyEffectiveScope,
} from "../../../../shared/infra/http/authorizationMiddleware";

const router = express.Router();
const repo = new PgTrainingEventRepository();
const quizRepo = new PgQuizRepository();
const userRepo = new PgUserRepository();
const roleRepo = new PgRoleRepository();
const requirePermission = createRequirePermission(userRepo, roleRepo);
const applyEffectiveScope = createApplyEffectiveScope(userRepo, roleRepo);
// Nudges open browsers (attendees' phones, the trainer's screen) to refetch after a change.
const notifier = createSocketTrainingEventNotifier(getIO);

// ── Trainer: running a training event needs session.host (Trainer, Admin) ──
const trainer = [requireAuthenticatedUser, requirePermission("session.host"), applyEffectiveScope];
const userId = (req: Request) => req.authUser!.id!;
const param = (req: Request, name: string) => String(req.params[name]);

const createEvent = new CreateTrainingEventUseCase(repo, quizRepo);
const listEvents = new ListTrainingEventsUseCase(repo);
const getEvent = new GetTrainingEventUseCase(repo);
const openCheck = new OpenCheckUseCase(repo, quizRepo, notifier);
const closeCheck = new CloseCheckUseCase(repo, notifier);
const endEvent = new EndTrainingEventUseCase(repo, notifier);
const getResults = new GetTrainingEventResultsUseCase(repo);
const mergeAttendees = new MergeAttendeesUseCase(repo, notifier);

const handle = <T>(fn: ConstructorParameters<typeof UseCaseController<T>>[0], status: 200 | 201 = 200) =>
    (req: Request, res: express.Response) => new UseCaseController(fn, status).execute(req, res);

router.post("/training-events", ...trainer, handle((req) => createEvent.execute(req.body ?? {}, userId(req)), 201));
router.get("/training-events", ...trainer, handle((req) => listEvents.execute(userId(req), req.effectiveScope)));
router.get("/training-events/:id", ...trainer, handle((req) => getEvent.execute(param(req, "id"), userId(req), req.effectiveScope)));
router.post("/training-events/:id/checks/:checkId/open", ...trainer,
    handle((req) => openCheck.execute(param(req, "id"), param(req, "checkId"), userId(req), req.effectiveScope)));
router.post("/training-events/:id/checks/:checkId/close", ...trainer,
    handle((req) => closeCheck.execute(param(req, "id"), param(req, "checkId"), userId(req), req.effectiveScope)));
router.post("/training-events/:id/end", ...trainer, handle((req) => endEvent.execute(param(req, "id"), userId(req), req.effectiveScope)));
router.get("/training-events/:id/results", ...trainer, handle((req) => getResults.execute(param(req, "id"), userId(req), req.effectiveScope)));
router.post("/training-events/:id/attendees/:attendeeId/merge", ...trainer,
    handle((req) => mergeAttendees.execute(param(req, "id"), param(req, "attendeeId"), req.body?.intoAttendeeId, userId(req), req.effectiveScope)));

// ── Attendee: public, by join code + the X-Attendee-Token the browser got when joining ──
const token = (req: Request) => req.header("x-attendee-token") || undefined;
const code = (req: Request) => param(req, "joinCode");

const eventForAttendee = new GetEventForAttendeeUseCase(repo);
const joinAsGuest = new JoinAsGuestUseCase(repo, notifier);
const listGuests = new ListGuestsUseCase(repo);
const rejoinAsGuest = new RejoinAsGuestUseCase(repo);
const currentActivity = new GetCurrentActivityUseCase(repo);
const saveAnswer = new SaveCheckAnswerUseCase(repo);
const submitCheck = new SubmitCheckUseCase(repo, notifier);

router.get("/attend/:joinCode", handle((req) => eventForAttendee.execute(code(req), token(req))));
router.post("/attend/:joinCode/attendees", handle((req) => joinAsGuest.execute(code(req), req.body?.name), 201));
router.get("/attend/:joinCode/guests", handle((req) => listGuests.execute(code(req))));
router.post("/attend/:joinCode/rejoin", handle((req) => rejoinAsGuest.execute(code(req), req.body?.attendeeId)));
router.get("/attend/:joinCode/current", handle((req) => currentActivity.execute(code(req), token(req))));
router.put("/attend/:joinCode/checks/:checkId/answers/:questionId",
    handle((req) => saveAnswer.execute(code(req), token(req), param(req, "checkId"), param(req, "questionId"), req.body?.optionIndex)));
router.post("/attend/:joinCode/checks/:checkId/submit", handle((req) => submitCheck.execute(code(req), token(req), param(req, "checkId"))));

export default router;
