// SESSION-BE-002's own recommended rule: an attempt's timer never outlives
// the Test Session's own availability window, even if the individual time
// limit would otherwise extend past it. e.g. session closes 17:00, 30-minute
// limit, participant starts at 16:50 -> expires at 17:00, not 17:20.
export function computeAttemptExpiry(startedAt: Date, timeLimitMinutes: number, availableUntil: Date): Date {
    const byTimeLimit = new Date(startedAt.getTime() + timeLimitMinutes * 60_000);
    return byTimeLimit < availableUntil ? byTimeLimit : availableUntil;
}
