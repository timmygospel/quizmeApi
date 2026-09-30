import { MyTestSessionStatus } from "../domain/myTestSessionStatus";

export interface MyTestSessionDTO {
    testSessionId: string;
    name: string;
    assessmentId: string;
    availableFrom: string;
    availableUntil: string;
    timeLimitMinutes: number;
    status: MyTestSessionStatus;
    maxAttempts: number;
    attemptsUsed: number;
    /** True when a finished (SUBMITTED/TIMED_OUT) test can be taken again right now. */
    canRetake: boolean;
}
