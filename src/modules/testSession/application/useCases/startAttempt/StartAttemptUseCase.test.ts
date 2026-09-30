import { StartAttemptUseCase } from "./StartAttemptUseCase";
import { AttemptResponse } from "../../../domain/AttemptResponse";
import {
    makeAttempt, makeAttemptRepo, makeAssessmentRepo, makeParticipant, makeSession, makeTestSessionRepo,
} from "../../../testing/fakes";

describe("StartAttemptUseCase", () => {
    it("starts a new attempt when none is in progress", async () => {
        const attemptRepo = makeAttemptRepo();
        const useCase = new StartAttemptUseCase(makeTestSessionRepo(), attemptRepo, makeAssessmentRepo());

        const result = await useCase.execute("session-1", "user-1");

        expect(result.isSuccess).toBe(true);
        expect(result.getValue().resumed).toBe(false);
        expect(result.getValue().responses).toEqual([]);
        expect(attemptRepo.create).toHaveBeenCalledTimes(1);
    });

    it("resumes the attempt already in progress, with the answers and review flags saved so far", async () => {
        const inProgress = makeAttempt({ expiresAt: new Date(Date.now() + 60_000) }, "attempt-7");
        const saved = [
            new AttemptResponse({ testAttemptId: "attempt-7", assessmentQuestionId: "q0", selectedOptionId: "q0-a", isCorrect: true, markedForReview: false }),
            new AttemptResponse({ testAttemptId: "attempt-7", assessmentQuestionId: "q1", selectedOptionId: null, isCorrect: null, markedForReview: true }),
        ];
        const attemptRepo = makeAttemptRepo({
            findInProgressForParticipant: jest.fn().mockResolvedValue(inProgress),
            findResponses: jest.fn().mockResolvedValue(saved),
        });
        const sessionRepo = makeTestSessionRepo({ findParticipantForUser: jest.fn().mockResolvedValue(makeParticipant("IN_PROGRESS")) });
        const useCase = new StartAttemptUseCase(sessionRepo, attemptRepo, makeAssessmentRepo());

        const result = await useCase.execute("session-1", "user-1");

        expect(result.isSuccess).toBe(true);
        const value = result.getValue();
        expect(value.resumed).toBe(true);
        expect(value.attempt.id).toBe("attempt-7");
        expect(value.attempt.expiresAt).toEqual(inProgress.expiresAt); // the timer keeps running — not reset
        expect(value.responses).toBe(saved);
        expect(value.questions.map((q) => q.id)).toEqual(["q0", "q1"]);
        // no second attempt, and the attempt limit (1) doesn't block a resume
        expect(attemptRepo.create).not.toHaveBeenCalled();
        expect(attemptRepo.countForParticipant).not.toHaveBeenCalled();
    });

    it("finalizes an in-progress attempt whose time has run out instead of resuming it", async () => {
        const expired = makeAttempt({ expiresAt: new Date(Date.now() - 1000) }, "attempt-7");
        const attemptRepo = makeAttemptRepo({ findInProgressForParticipant: jest.fn().mockResolvedValue(expired) });
        const sessionRepo = makeTestSessionRepo({ findParticipantForUser: jest.fn().mockResolvedValue(makeParticipant("IN_PROGRESS")) });
        const useCase = new StartAttemptUseCase(sessionRepo, attemptRepo, makeAssessmentRepo());

        const result = await useCase.execute("session-1", "user-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toMatch(/^CONFLICT: Your time for this test ran out/);
        expect(attemptRepo.markTimedOut).toHaveBeenCalledWith("attempt-7", expect.any(Number), expect.any(Boolean), expired.expiresAt);
        expect(sessionRepo.updateParticipantStatus).toHaveBeenCalledWith("participant-1", "TIMED_OUT", expect.anything());
        expect(attemptRepo.create).not.toHaveBeenCalled();
    });

    it("does not resume into a session that has been cancelled", async () => {
        const attemptRepo = makeAttemptRepo({ findInProgressForParticipant: jest.fn().mockResolvedValue(makeAttempt()) });
        const sessionRepo = makeTestSessionRepo({
            findById: jest.fn().mockResolvedValue(makeSession({ status: "CANCELLED" })),
            findParticipantForUser: jest.fn().mockResolvedValue(makeParticipant("IN_PROGRESS")),
        });
        const result = await new StartAttemptUseCase(sessionRepo, attemptRepo, makeAssessmentRepo()).execute("session-1", "user-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toMatch(/^CONFLICT: Test session is not currently available \(CANCELLED\)/);
    });

    it("refuses someone who is not assigned", async () => {
        const sessionRepo = makeTestSessionRepo({ findParticipantForUser: jest.fn().mockResolvedValue(null) });
        const result = await new StartAttemptUseCase(sessionRepo, makeAttemptRepo(), makeAssessmentRepo()).execute("session-1", "stranger");
        expect(result.errorValue()).toMatch(/^FORBIDDEN:/);
    });
});
