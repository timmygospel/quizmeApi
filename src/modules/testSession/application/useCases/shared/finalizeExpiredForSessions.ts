import { finalizeExpiredAttempt, FinalizeExpiredAttemptDeps } from "./finalizeExpiredAttempt";

/**
 * Brings these test sessions' attempts and participants up to date before they're read, so results
 * never show an abandoned attempt as still "in progress" or a no-show as still "assigned":
 *   - IN_PROGRESS attempts past their expiry are scored and marked TIMED_OUT (participant too);
 *   - participants who never started and no longer can become EXPIRED.
 * There's no background job — this runs on every read that reports on attempt/participant state.
 */
export async function finalizeExpiredForSessions(
    testSessionIds: string[],
    deps: FinalizeExpiredAttemptDeps,
    now: Date = new Date()
): Promise<void> {
    if (testSessionIds.length === 0) return;
    const expired = await deps.attemptRepo.findExpiredInProgress(testSessionIds, now);
    for (const attempt of expired) {
        await finalizeExpiredAttempt(attempt, deps);
    }
    await deps.testSessionRepo.expireUnstartedParticipants(testSessionIds, now);
}
