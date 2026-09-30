import { Result } from "../../../../../shared/core/Result";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { deriveMyTestSessionStatus } from "../../../domain/myTestSessionStatus";
import { resolveTestSessionStatus } from "../../../domain/resolveTestSessionStatus";
import { MyTestSessionDTO } from "../../../dtos/MyTestSessionDTO";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { finalizeExpiredForSessions } from "../shared/finalizeExpiredForSessions";

export class GetMyTestSessionsUseCase {
    constructor(
        private repo: ITestSessionRepository,
        private attemptRepo: IAttemptRepository,
        private assessmentRepo: IAssessmentRepository
    ) { }

    // Abandoned attempts and no-shows are finalized before anything is reported (no background job).
    private finalizeExpired(testSessionIds: string[]): Promise<void> {
        return finalizeExpiredForSessions(testSessionIds, {
            attemptRepo: this.attemptRepo,
            testSessionRepo: this.repo,
            assessmentRepo: this.assessmentRepo,
        });
    }

    async execute(userId: string): Promise<Result<MyTestSessionDTO[]>> {
        try {
            // Finalize first, then read — so a timed-out or missed test shows as such right away.
            const assigned = await this.repo.findMyTestSessions(userId);
            await this.finalizeExpired(assigned.map((r) => r.session.id!));
            const rows = await this.repo.findMyTestSessions(userId);
            const now = new Date();

            // A cancelled session can't be taken — don't offer it.
            const items: MyTestSessionDTO[] = rows
                .filter(({ session }) => session.status !== "CANCELLED")
                .map(({ session, participant, attemptsUsed }) => {
                    const status = deriveMyTestSessionStatus(participant.status, session.availableFrom, session.availableUntil, now);
                    const open = resolveTestSessionStatus(session.status, session.availableFrom, session.availableUntil, now) === "OPEN";
                    return {
                        testSessionId: session.id!,
                        name: session.name,
                        assessmentId: session.assessmentId,
                        availableFrom: session.availableFrom.toISOString(),
                        availableUntil: session.availableUntil.toISOString(),
                        timeLimitMinutes: session.timeLimitMinutes,
                        status,
                        maxAttempts: session.maxAttempts,
                        attemptsUsed,
                        canRetake: (status === "SUBMITTED" || status === "TIMED_OUT") && open && attemptsUsed < session.maxAttempts,
                    };
                });

            return Result.ok(items);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
