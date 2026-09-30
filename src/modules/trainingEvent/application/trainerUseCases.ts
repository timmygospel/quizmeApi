// What the trainer does with a Training Event: create it from a quiz (one Knowledge Check per section),
// open/close checks, end it, see results, merge duplicate attendees. A trainer manages their own
// events; organisation-wide callers (e.g. Organisation Admin) manage all of them. Anyone else gets a
// 404, same as for another trainer's test session.
import { Result } from "../../../shared/core/Result";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";
import { recordAuditEvent } from "../../../shared/infra/audit/recordAuditEvent";
import { IQuizRepository } from "../../quiz/domain/IQuizRepository";
import { ITrainingEventRepository } from "../domain/ITrainingEventRepository";
import { newJoinCode } from "../domain/credentials";
import { ITrainingEventNotifier, silentNotifier } from "../domain/ITrainingEventNotifier";
import { TrainingEvent } from "../domain/TrainingEvent";
import {
    TrainingEventDTO,
    TrainingEventDetailDTO,
    TrainingEventResultsDTO,
    toCheckDTO,
    toEventDTO,
} from "../dtos/TrainingEventDTO";

const NAME_MAX = 120;

export interface CreateTrainingEventInput {
    name?: unknown;
    quizId?: unknown;
    eventDate?: unknown;
}

function canManage(event: TrainingEvent, userId: string, scope?: EffectiveScope): boolean {
    return scope?.type === "ORGANISATION" || event.ownerId === userId;
}

async function loadManaged(
    repo: ITrainingEventRepository, eventId: string, userId: string, scope?: EffectiveScope
): Promise<Result<TrainingEvent>> {
    const event = await repo.findById(eventId);
    if (!event || !canManage(event, userId, scope)) return Result.fail(`NOT_FOUND: Training Session ${eventId} not found`);
    return Result.ok(event);
}

async function run<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
        return await fn();
    } catch (err) {
        return Result.fail(err instanceof Error ? err.message : String(err));
    }
}

export class CreateTrainingEventUseCase {
    constructor(private repo: ITrainingEventRepository, private quizRepo: IQuizRepository) { }

    execute(input: CreateTrainingEventInput, ownerId: string): Promise<Result<TrainingEventDetailDTO>> {
        return run(async () => {
            const name = typeof input.name === "string" ? input.name.trim() : "";
            if (!name) return Result.fail("Give the Training Session a name");
            if (name.length > NAME_MAX) return Result.fail(`The name can be at most ${NAME_MAX} characters`);
            if (typeof input.quizId !== "string" || !input.quizId) return Result.fail("Choose the Knowledge Module this session uses");
            let eventDate: string | null = null;
            if (input.eventDate != null && input.eventDate !== "") {
                if (typeof input.eventDate !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(input.eventDate) || isNaN(Date.parse(input.eventDate))) {
                    return Result.fail("eventDate must be a date (YYYY-MM-DD)");
                }
                eventDate = input.eventDate;
            }

            const quiz = await this.quizRepo.findById(input.quizId);
            if (!quiz) return Result.fail(`NOT_FOUND: Knowledge Module ${input.quizId} not found`);
            // Each non-empty section becomes a Knowledge Check, in section order.
            const sections = quiz.sections.filter((s) => s.id && s.questionIds.length > 0);
            if (sections.length === 0) {
                return Result.fail("This Knowledge Module has no sections with questions. Each section becomes a Knowledge Check — add sections in the Knowledge Module editor first.");
            }

            let joinCode = "";
            for (let attempt = 0; attempt < 10 && !joinCode; attempt++) {
                const candidate = newJoinCode();
                if (!(await this.repo.joinCodeExists(candidate))) joinCode = candidate;
            }
            if (!joinCode) return Result.fail("Couldn't generate a join code — please try again");

            const event = await this.repo.create(
                { name, quizId: quiz.id!, ownerId, joinCode, eventDate },
                sections.map((s, i) => ({ quizSectionId: s.id!, name: s.name, position: i }))
            );
            await recordAuditEvent({
                actorUserId: ownerId, eventType: "TRAINING_EVENT_CREATED", entityType: "training_event", entityId: event.id,
                metadata: { quizId: quiz.id, checks: sections.length },
            });
            const checks = await this.repo.findChecks(event.id);
            return Result.ok({ ...toEventDTO(event), attendeeCount: 0, checks: checks.map((c) => toCheckDTO(c, undefined)) });
        });
    }
}

export class ListTrainingEventsUseCase {
    constructor(private repo: ITrainingEventRepository) { }

    execute(userId: string, scope?: EffectiveScope): Promise<Result<TrainingEventDTO[]>> {
        return run(async () => {
            const events = await this.repo.list(scope?.type === "ORGANISATION" ? undefined : userId);
            return Result.ok(events.map(toEventDTO));
        });
    }
}

export class GetTrainingEventUseCase {
    constructor(private repo: ITrainingEventRepository) { }

    execute(eventId: string, userId: string, scope?: EffectiveScope): Promise<Result<TrainingEventDetailDTO>> {
        return run(async () => {
            const loaded = await loadManaged(this.repo, eventId, userId, scope);
            if (loaded.isFailure) return Result.fail(loaded.errorValue());
            const event = loaded.getValue();
            const [checks, counts, attendeeCount] = await Promise.all([
                this.repo.findChecks(event.id), this.repo.countSubmissions(event.id), this.repo.countAttendees(event.id),
            ]);
            return Result.ok({ ...toEventDTO(event), attendeeCount, checks: checks.map((c) => toCheckDTO(c, counts[c.id])) });
        });
    }
}

export class OpenCheckUseCase {
    constructor(
        private repo: ITrainingEventRepository,
        private quizRepo: IQuizRepository,
        private notifier: ITrainingEventNotifier = silentNotifier
    ) { }

    execute(eventId: string, checkId: string, userId: string, scope?: EffectiveScope): Promise<Result<void>> {
        return run(async () => {
            const loaded = await loadManaged(this.repo, eventId, userId, scope);
            if (loaded.isFailure) return Result.fail(loaded.errorValue());
            const event = loaded.getValue();
            if (event.status !== "OPEN") return Result.fail("CONFLICT: This Training Session has ended");
            const check = await this.repo.findCheck(checkId);
            if (!check || check.trainingEventId !== event.id) return Result.fail(`NOT_FOUND: Knowledge Check ${checkId} not found`);
            if (check.status === "OPEN") return Result.ok<void>();

            // The questions are copied the first time a check opens; reopening reuses that copy.
            let snapshot: { sourceQuestionId: string | null; question: string; options: { text: string; correct: boolean }[] }[] = [];
            if (!(await this.repo.hasSnapshot(check.id))) {
                const quiz = await this.quizRepo.findById(event.quizId);
                const section = quiz?.sections.find((s) => s.id === check.quizSectionId);
                const byId = new Map((quiz?.questions ?? []).map((q) => [q.id, q]));
                snapshot = (section?.questionIds ?? [])
                    .map((id) => byId.get(id))
                    .filter((q): q is NonNullable<typeof q> => !!q)
                    .map((q) => ({
                        sourceQuestionId: q.id ?? null,
                        question: q.question.value,
                        options: q.options.map((o) => ({ text: o.text.value, correct: o.correct })),
                    }));
                if (snapshot.length === 0) {
                    return Result.fail(`"${check.name}" has no questions any more — add some to that section of the Knowledge Module first`);
                }
            }
            await this.repo.openCheck(check.id, snapshot, new Date());
            this.notifier.checksChanged(event.joinCode);
            await recordAuditEvent({
                actorUserId: userId, eventType: "KNOWLEDGE_CHECK_OPENED", entityType: "training_event", entityId: event.id,
                metadata: { checkId: check.id, name: check.name },
            });
            return Result.ok<void>();
        });
    }
}

export class CloseCheckUseCase {
    constructor(private repo: ITrainingEventRepository, private notifier: ITrainingEventNotifier = silentNotifier) { }

    execute(eventId: string, checkId: string, userId: string, scope?: EffectiveScope): Promise<Result<void>> {
        return run(async () => {
            const loaded = await loadManaged(this.repo, eventId, userId, scope);
            if (loaded.isFailure) return Result.fail(loaded.errorValue());
            const check = await this.repo.findCheck(checkId);
            if (!check || check.trainingEventId !== eventId) return Result.fail(`NOT_FOUND: Knowledge Check ${checkId} not found`);
            if (check.status !== "OPEN") return Result.ok<void>();
            await this.repo.closeCheck(check.id, new Date());
            this.notifier.checksChanged(loaded.getValue().joinCode);
            await recordAuditEvent({
                actorUserId: userId, eventType: "KNOWLEDGE_CHECK_CLOSED", entityType: "training_event", entityId: eventId,
                metadata: { checkId: check.id, name: check.name },
            });
            return Result.ok<void>();
        });
    }
}

export class EndTrainingEventUseCase {
    constructor(private repo: ITrainingEventRepository, private notifier: ITrainingEventNotifier = silentNotifier) { }

    execute(eventId: string, userId: string, scope?: EffectiveScope): Promise<Result<void>> {
        return run(async () => {
            const loaded = await loadManaged(this.repo, eventId, userId, scope);
            if (loaded.isFailure) return Result.fail(loaded.errorValue());
            if (loaded.getValue().status === "ENDED") return Result.ok<void>();
            await this.repo.endEvent(eventId, new Date());
            this.notifier.checksChanged(loaded.getValue().joinCode);
            await recordAuditEvent({ actorUserId: userId, eventType: "TRAINING_EVENT_ENDED", entityType: "training_event", entityId: eventId });
            return Result.ok<void>();
        });
    }
}

export class GetTrainingEventResultsUseCase {
    constructor(private repo: ITrainingEventRepository) { }

    execute(eventId: string, userId: string, scope?: EffectiveScope): Promise<Result<TrainingEventResultsDTO>> {
        return run(async () => {
            const loaded = await loadManaged(this.repo, eventId, userId, scope);
            if (loaded.isFailure) return Result.fail(loaded.errorValue());
            const [checks, rows] = await Promise.all([this.repo.findChecks(eventId), this.repo.getResults(eventId)]);
            return Result.ok({
                checks: checks.map((c) => ({ id: c.id, name: c.name, position: c.position, status: c.status })),
                attendees: rows.map((r) => ({ ...r, joinedAt: r.joinedAt.toISOString() })),
            });
        });
    }
}

// A guest who lost their browser data and joined again shows up twice; the trainer folds the new
// record into the old one. Only a guest can be merged away — signed-in attendees are one per user.
export class MergeAttendeesUseCase {
    constructor(private repo: ITrainingEventRepository, private notifier: ITrainingEventNotifier = silentNotifier) { }

    execute(eventId: string, fromId: string, intoId: unknown, userId: string, scope?: EffectiveScope): Promise<Result<void>> {
        return run(async () => {
            const loaded = await loadManaged(this.repo, eventId, userId, scope);
            if (loaded.isFailure) return Result.fail(loaded.errorValue());
            if (typeof intoId !== "string" || !intoId) return Result.fail("intoAttendeeId is required");
            if (intoId === fromId) return Result.fail("Choose a different attendee to merge into");
            const [from, into] = await Promise.all([this.repo.findAttendee(fromId), this.repo.findAttendee(intoId)]);
            if (!from || from.trainingEventId !== eventId || !into || into.trainingEventId !== eventId) {
                return Result.fail("NOT_FOUND: Attendee not found in this Training Session");
            }
            if (from.mergedIntoId || into.mergedIntoId) return Result.fail("CONFLICT: One of these attendees has already been merged");
            if (from.userId) return Result.fail("Only a guest can be merged into someone else");
            await this.repo.mergeAttendees(from.id, into.id);
            this.notifier.progress(loaded.getValue().joinCode);
            await recordAuditEvent({
                actorUserId: userId, eventType: "TRAINING_EVENT_ATTENDEES_MERGED", entityType: "training_event", entityId: eventId,
                metadata: { from: from.id, into: into.id },
            });
            return Result.ok<void>();
        });
    }
}
