import { GetMyTestSessionsUseCase } from "./GetMyTestSessionsUseCase";
import { makeAttemptRepo, makeAssessmentRepo, makeParticipant, makeSession, makeTestSessionRepo } from "../../../testing/fakes";
import { ParticipantStatus } from "../../../domain/TestSessionParticipant";

function repoWith(status: ParticipantStatus, attemptsUsed: number, sessionOverrides = {}) {
    const row = { session: makeSession({ maxAttempts: 3, ...sessionOverrides }), participant: makeParticipant(status), attemptsUsed,
        details: { assessmentName: "Sales Skills", questionCount: 20, passMark: 80, trainerName: "Sam Owner", resultAttemptId: null } };
    return makeTestSessionRepo({ findMyTestSessions: jest.fn().mockResolvedValue([row]) });
}

async function mine(repo: ReturnType<typeof makeTestSessionRepo>) {
    const result = await new GetMyTestSessionsUseCase(repo, makeAttemptRepo(), makeAssessmentRepo()).execute("user-1");
    return result.getValue()[0];
}

describe("GetMyTestSessionsUseCase — retakes", () => {
    it("offers a retake after a submission while attempts remain and the session is open", async () => {
        const item = await mine(repoWith("COMPLETED", 1));
        expect(item).toMatchObject({ status: "SUBMITTED", maxAttempts: 3, attemptsUsed: 1, canRetake: true });
    });

    it("offers a retake after a timed-out attempt too", async () => {
        expect((await mine(repoWith("TIMED_OUT", 2))).canRetake).toBe(true);
    });

    it("no retake once all attempts are used", async () => {
        expect((await mine(repoWith("COMPLETED", 3))).canRetake).toBe(false);
    });

    it("no retake once the session has closed", async () => {
        expect((await mine(repoWith("COMPLETED", 1, { availableUntil: new Date(Date.now() - 1000) }))).canRetake).toBe(false);
    });

    it("no retake while an attempt is in progress", async () => {
        expect((await mine(repoWith("IN_PROGRESS", 1))).canRetake).toBe(false);
    });
});

describe("GetMyTestSessionsUseCase — details", () => {
    it("includes what the participant needs before starting", async () => {
        const item = await mine(repoWith("ASSIGNED", 0));
        expect(item).toMatchObject({ assessmentName: "Sales Skills", questionCount: 20, passMark: 80, trainerName: "Sam Owner", resultAttemptId: null });
    });
});
