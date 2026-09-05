import { MyTestSessionStatus } from "../domain/myTestSessionStatus";

export interface MyTestSessionDTO {
    testSessionId: string;
    name: string;
    assessmentId: string;
    availableFrom: string;
    availableUntil: string;
    timeLimitMinutes: number;
    status: MyTestSessionStatus;
}
