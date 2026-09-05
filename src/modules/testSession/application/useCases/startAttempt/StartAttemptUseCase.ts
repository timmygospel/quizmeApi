import { Result } from "../../../../../shared/core/Result";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { Attempt } from "../../../domain/Attempt";
import { resolveTestSessionStatus } from "../../../domain/resolveTestSessionStatus";
import { computeAttemptExpiry } from "../../../domain/attemptExpiry";
import { AttemptQuestionDTO } from "../../../dtos/AttemptDTO";

export interface StartAttemptResult {
    attempt: Attempt;
    questions: AttemptQuestionDTO[];
}

const TERMINAL_PARTICIPANT_STATUSES = ["COMPLETED", "TIMED_OUT", "EXPIRED"];

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
            const status = resolveTestSessionStatus(session.status, session.availableFrom, session.availableUntil, now);
            if (status !== "OPEN") {
                return Result.fail(`CONFLICT: Test session is not currently available (${status})`);
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

            const questions: AttemptQuestionDTO[] = (assessment.questions ?? []).map((q) => ({
                id: q.id!,
                question: q.question.value,
                options: q.options.map((o) => ({ id: o.id!, text: o.text.value })),
            }));

            return Result.ok({ attempt, questions });
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
