import { Result } from "../../../../../shared/core/Result";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { Attempt } from "../../../domain/Attempt";
import { AttemptResponse } from "../../../domain/AttemptResponse";
import { Assessment } from "../../../../assessment/domain/Assessment";
import { finalizeExpiredAttempt } from "../shared/finalizeExpiredAttempt";
import { resolveTestSessionStatus } from "../../../domain/resolveTestSessionStatus";
import { computeAttemptExpiry } from "../../../domain/attemptExpiry";
import { AttemptQuestionDTO } from "../../../dtos/AttemptDTO";

export interface StartAttemptResult {
    attempt: Attempt;
    questions: AttemptQuestionDTO[];
    /** Answers/flags already saved — non-empty only when resuming. */
    responses: AttemptResponse[];
    /** True when an attempt already in progress was picked up rather than a new one started. */
    resumed: boolean;
}

const TERMINAL_PARTICIPANT_STATUSES = ["COMPLETED", "TIMED_OUT", "EXPIRED"];

// Questions as the participant sees them — option correctness is never sent.
function toAttemptQuestions(assessment: Assessment): AttemptQuestionDTO[] {
    return (assessment.questions ?? []).map((q) => ({
        id: q.id!,
        question: q.question.value,
        options: q.options.map((o) => ({ id: o.id!, text: o.text.value })),
    }));
}

export class StartAttemptUseCase {
    constructor(
        private testSessionRepo: ITestSessionRepository,
        private attemptRepo: IAttemptRepository,
        private assessmentRepo: IAssessmentRepository
    ) { }

    async execute(testSessionId: string, userId: string): Promise<Result<StartAttemptResult>> {
        try {
            const session = await this.testSessionRepo.findById(testSessionId);
            if (!session) return Result.fail(`NOT_FOUND: Test session with id ${testSessionId} not found`);

            // Never allow access simply because someone knows the Session id —
            // must be an explicit participant assignment.
            const participant = await this.testSessionRepo.findParticipantForUser(testSessionId, userId);
            if (!participant) return Result.fail("FORBIDDEN: You are not assigned to this test session");

            const now = new Date();
            const deps = { attemptRepo: this.attemptRepo, testSessionRepo: this.testSessionRepo, assessmentRepo: this.assessmentRepo };

            // An attempt already in progress (browser closed, device changed…) is resumed rather than
            // starting another — unless its time has run out, in which case it's finalized now.
            const inProgress = await this.attemptRepo.findInProgressForParticipant(participant.id!);
            if (inProgress && now >= inProgress.expiresAt) {
                await finalizeExpiredAttempt(inProgress, deps);
                return Result.fail("CONFLICT: Your time for this test ran out, so your answers were submitted automatically");
            }

            const status = resolveTestSessionStatus(session.status, session.availableFrom, session.availableUntil, now);
            if (status !== "OPEN") {
                return Result.fail(`CONFLICT: Test session is not currently available (${status})`);
            }

            if (inProgress) {
                const assessment = await this.assessmentRepo.findById(session.assessmentId);
                if (!assessment) return Result.fail("NOT_FOUND: The assessment for this test session could not be found");
                const responses = await this.attemptRepo.findResponses(inProgress.id!);
                return Result.ok({ attempt: inProgress, questions: toAttemptQuestions(assessment), responses, resumed: true });
            }

            if (TERMINAL_PARTICIPANT_STATUSES.includes(participant.status)) {
                return Result.fail(`CONFLICT: You have already ${participant.status.toLowerCase().replace("_", " ")} this test session`);
            }

            const attemptCount = await this.attemptRepo.countForParticipant(participant.id!);
            if (attemptCount >= session.maxAttempts) {
                return Result.fail("CONFLICT: Attempt limit reached for this test session");
            }

            const assessment = await this.assessmentRepo.findById(session.assessmentId);
            if (!assessment) return Result.fail("NOT_FOUND: The assessment for this test session could not be found");

            const startedAt = now;
            const expiresAt = computeAttemptExpiry(startedAt, session.timeLimitMinutes, session.availableUntil);

            const attempt = await this.attemptRepo.create(
                new Attempt({
                    testSessionId,
                    testSessionParticipantId: participant.id!,
                    attemptNumber: attemptCount + 1,
                    startedAt,
                    expiresAt,
                    status: "IN_PROGRESS",
                    scorePercentage: null,
                    passed: null,
                })
            );

            await this.testSessionRepo.updateParticipantStatus(participant.id!, "IN_PROGRESS", {
                startedAt: participant.startedAt ?? startedAt,
            });

            return Result.ok({ attempt, questions: toAttemptQuestions(assessment), responses: [], resumed: false });
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
