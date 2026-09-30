// What an attendee's browser can do, identified by the event's join code plus the attendee token it
// was given when joining (sent as X-Attendee-Token). No account needed. A token only ever works for
// the event it was issued for. See the Training Event design notes (Notion: "when browser is closed").
import { Result } from "../../../shared/core/Result";
import { ITrainingEventRepository } from "../domain/ITrainingEventRepository";
import { hashAttendeeToken, newAttendeeToken, normaliseJoinCode } from "../domain/credentials";
import { Attendee, CheckQuestion, CheckResponse, TrainingEvent, cleanDisplayName, scoreCheck } from "../domain/TrainingEvent";
import {
    AttendeeDTO,
    CheckResultDTO,
    CurrentActivityDTO,
    JoinResultDTO,
    MyCheckStatus,
    PublicEventDTO,
} from "../dtos/TrainingEventDTO";

const toAttendeeDTO = (a: Attendee): AttendeeDTO => ({ id: a.id, displayName: a.displayName, isGuest: a.userId === null });

async function run<T>(fn: () => Promise<Result<T>>): Promise<Result<T>> {
    try {
        return await fn();
    } catch (err) {
        return Result.fail(err instanceof Error ? err.message : String(err));
    }
}

async function findEvent(repo: ITrainingEventRepository, joinCode: string): Promise<TrainingEvent | null> {
    return repo.findByJoinCode(normaliseJoinCode(joinCode));
}

/** The attendee this token belongs to — only if it was issued for this event. */
async function attendeeFor(repo: ITrainingEventRepository, event: TrainingEvent, token: string | undefined): Promise<Attendee | null> {
    if (!token) return null;
    const attendee = await repo.findAttendeeByTokenHash(hashAttendeeToken(token));
    return attendee && attendee.trainingEventId === event.id ? attendee : null;
}

async function issueToken(repo: ITrainingEventRepository, attendee: Attendee): Promise<JoinResultDTO> {
    const token = newAttendeeToken();
    await repo.addToken(attendee.id, hashAttendeeToken(token));
    return { token, attendee: toAttendeeDTO(attendee) };
}

function review(questions: CheckQuestion[], responses: CheckResponse[], scorePercentage: number): CheckResultDTO {
    const byQuestion = new Map(responses.map((r) => [r.checkQuestionId, r]));
    return {
        scorePercentage,
        review: questions.map((q) => {
            const r = byQuestion.get(q.id);
            return { questionId: q.id, question: q.question, options: q.options, selectedIndex: r?.optionIndex ?? null, isCorrect: r?.isCorrect === true };
        }),
    };
}

/** Scanning the QR: what the event is, and who this browser already is (if anyone). */
export class GetEventForAttendeeUseCase {
    constructor(private repo: ITrainingEventRepository) { }

    execute(joinCode: string, token: string | undefined): Promise<Result<PublicEventDTO>> {
        return run(async () => {
            const event = await findEvent(this.repo, joinCode);
            if (!event) return Result.fail("NOT_FOUND: No training event has that code — check it with your trainer");
            const attendee = await attendeeFor(this.repo, event, token);
            return Result.ok({ name: event.name, eventDate: event.eventDate, status: event.status, attendee: attendee ? toAttendeeDTO(attendee) : null });
        });
    }
}

/** First visit: enter a name once; the browser gets a token that brings it back from then on. */
export class JoinAsGuestUseCase {
    constructor(private repo: ITrainingEventRepository) { }

    execute(joinCode: string, rawName: unknown): Promise<Result<JoinResultDTO>> {
        return run(async () => {
            const event = await findEvent(this.repo, joinCode);
            if (!event) return Result.fail("NOT_FOUND: No training event has that code — check it with your trainer");
            if (event.status !== "OPEN") return Result.fail("CONFLICT: This training event has ended");
            const name = cleanDisplayName(rawName);
            if (!name) return Result.fail("Enter your name (up to 60 characters)");
            const attendee = await this.repo.createAttendee(event.id, name, null);
            return Result.ok(await issueToken(this.repo, attendee));
        });
    }
}

/** "Have you already joined today?" — guests only; signed-in attendees are never listed. */
export class ListGuestsUseCase {
    constructor(private repo: ITrainingEventRepository) { }

    execute(joinCode: string): Promise<Result<AttendeeDTO[]>> {
        return run(async () => {
            const event = await findEvent(this.repo, joinCode);
            if (!event) return Result.fail("NOT_FOUND: No training event has that code — check it with your trainer");
            if (event.status !== "OPEN") return Result.fail("CONFLICT: This training event has ended");
            return Result.ok((await this.repo.listGuests(event.id)).map(toAttendeeDTO));
        });
    }
}

/** A guest who lost their token picks their name; this browser gets a new token for that record. */
export class RejoinAsGuestUseCase {
    constructor(private repo: ITrainingEventRepository) { }

    execute(joinCode: string, attendeeId: unknown): Promise<Result<JoinResultDTO>> {
        return run(async () => {
            const event = await findEvent(this.repo, joinCode);
            if (!event) return Result.fail("NOT_FOUND: No training event has that code — check it with your trainer");
            if (event.status !== "OPEN") return Result.fail("CONFLICT: This training event has ended");
            if (typeof attendeeId !== "string" || !attendeeId) return Result.fail("attendeeId is required");
            const attendee = await this.repo.findAttendee(attendeeId);
            if (!attendee || attendee.trainingEventId !== event.id || attendee.userId !== null || attendee.mergedIntoId) {
                return Result.fail("NOT_FOUND: That name isn't on this event's guest list");
            }
            return Result.ok(await issueToken(this.repo, attendee));
        });
    }
}

/** The attendee's home screen: every check with how they did, and the one open right now. */
export class GetCurrentActivityUseCase {
    constructor(private repo: ITrainingEventRepository) { }

    execute(joinCode: string, token: string | undefined): Promise<Result<CurrentActivityDTO>> {
        return run(async () => {
            const event = await findEvent(this.repo, joinCode);
            if (!event) return Result.fail("NOT_FOUND: No training event has that code — check it with your trainer");
            const attendee = await attendeeFor(this.repo, event, token);
            if (!attendee) return Result.fail("UNAUTHORIZED: Join the event first");
            await this.repo.touchAttendee(attendee.id, new Date());

            const [checks, attempts] = await Promise.all([this.repo.findChecks(event.id), this.repo.findAttemptsForAttendee(attendee.id)]);
            const attemptByCheck = new Map(attempts.map((a) => [a.checkId, a]));
            const myStatus = (checkId: string): MyCheckStatus => {
                const a = attemptByCheck.get(checkId);
                return !a ? "NOT_STARTED" : a.submittedAt ? "SUBMITTED" : "IN_PROGRESS";
            };

            const open = event.status === "OPEN" ? checks.find((c) => c.status === "OPEN") : undefined;
            let openCheck: CurrentActivityDTO["openCheck"] = null;
            if (open) {
                const [questions, responses] = await Promise.all([
                    this.repo.findCheckQuestions(open.id), this.repo.findResponses(open.id, attendee.id),
                ]);
                const attempt = attemptByCheck.get(open.id);
                const submitted = !!attempt?.submittedAt;
                openCheck = {
                    id: open.id,
                    name: open.name,
                    // correct answers are only revealed after submitting
                    questions: questions.map((q) => ({ id: q.id, question: q.question, options: q.options.map((o) => o.text) })),
                    answers: Object.fromEntries(responses.map((r) => [r.checkQuestionId, r.optionIndex])),
                    submitted,
                    result: submitted ? review(questions, responses, attempt!.scorePercentage ?? 0) : null,
                };
            }

            return Result.ok({
                event: { name: event.name, eventDate: event.eventDate, status: event.status },
                attendee: toAttendeeDTO(attendee),
                checks: checks.map((c) => ({
                    id: c.id, name: c.name, position: c.position, status: c.status, myStatus: myStatus(c.id),
                    scorePercentage: attemptByCheck.get(c.id)?.submittedAt ? attemptByCheck.get(c.id)!.scorePercentage : null,
                })),
                openCheck,
            });
        });
    }
}

async function openCheckFor(
    repo: ITrainingEventRepository, joinCode: string, token: string | undefined, checkId: string
): Promise<Result<{ attendee: Attendee; questions: CheckQuestion[] }>> {
    const event = await findEvent(repo, joinCode);
    if (!event) return Result.fail("NOT_FOUND: No training event has that code — check it with your trainer");
    const attendee = await attendeeFor(repo, event, token);
    if (!attendee) return Result.fail("UNAUTHORIZED: Join the event first");
    const check = await repo.findCheck(checkId);
    if (!check || check.trainingEventId !== event.id) return Result.fail(`NOT_FOUND: Knowledge Check ${checkId} not found`);
    if (event.status !== "OPEN" || check.status !== "OPEN") return Result.fail("CONFLICT: This Knowledge Check is closed");
    const attempt = await repo.findAttempt(check.id, attendee.id);
    if (attempt?.submittedAt) return Result.fail("CONFLICT: You've already submitted this Knowledge Check");
    return Result.ok({ attendee, questions: await repo.findCheckQuestions(check.id) });
}

/** Autosave: picking an option saves it straight away (changing it overwrites). */
export class SaveCheckAnswerUseCase {
    constructor(private repo: ITrainingEventRepository) { }

    execute(joinCode: string, token: string | undefined, checkId: string, questionId: string, optionIndex: unknown): Promise<Result<void>> {
        return run(async () => {
            const loaded = await openCheckFor(this.repo, joinCode, token, checkId);
            if (loaded.isFailure) return Result.fail(loaded.errorValue());
            const { attendee, questions } = loaded.getValue();
            const question = questions.find((q) => q.id === questionId);
            if (!question) return Result.fail("NOT_FOUND: That question isn't part of this Knowledge Check");
            if (typeof optionIndex !== "number" || !Number.isInteger(optionIndex) || optionIndex < 0 || optionIndex >= question.options.length) {
                return Result.fail("optionIndex must be one of the question's options");
            }
            await this.repo.saveResponse(checkId, attendee.id, {
                checkQuestionId: question.id, optionIndex, isCorrect: question.options[optionIndex].correct,
            });
            return Result.ok<void>();
        });
    }
}

/** Submit: scored on what was answered (unanswered = wrong); returns the score and correct answers. */
export class SubmitCheckUseCase {
    constructor(private repo: ITrainingEventRepository) { }

    execute(joinCode: string, token: string | undefined, checkId: string): Promise<Result<CheckResultDTO>> {
        return run(async () => {
            const loaded = await openCheckFor(this.repo, joinCode, token, checkId);
            if (loaded.isFailure) return Result.fail(loaded.errorValue());
            const { attendee, questions } = loaded.getValue();
            const responses = await this.repo.findResponses(checkId, attendee.id);
            const score = scoreCheck(questions.length, responses);
            const attempt = await this.repo.submitAttempt(checkId, attendee.id, score, new Date());
            return Result.ok(review(questions, responses, attempt.scorePercentage ?? score));
        });
    }
}
