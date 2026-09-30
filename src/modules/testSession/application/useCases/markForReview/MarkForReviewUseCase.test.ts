import { MarkForReviewUseCase } from "./MarkForReviewUseCase";
import { makeAttempt, makeAttemptRepo, makeAssessmentRepo, makeParticipant, makeTestSessionRepo } from "../../../testing/fakes";

describe("MarkForReviewUseCase", () => {
    it("saves the flag for the attempt owner", async () => {
        const attemptRepo = makeAttemptRepo({ findById: jest.fn().mockResolvedValue(makeAttempt()) });
        const result = await new MarkForReviewUseCase(attemptRepo, makeTestSessionRepo(), makeAssessmentRepo())
            .execute("attempt-1", "q1", "user-1", true);

        expect(result.isSuccess).toBe(true);
        expect(attemptRepo.setMarkedForReview).toHaveBeenCalledWith("attempt-1", "q1", true);
    });

    it("refuses someone else's attempt", async () => {
        const attemptRepo = makeAttemptRepo({ findById: jest.fn().mockResolvedValue(makeAttempt()) });
        const sessionRepo = makeTestSessionRepo({ findParticipantById: jest.fn().mockResolvedValue(makeParticipant("IN_PROGRESS", "someone-else")) });
        const result = await new MarkForReviewUseCase(attemptRepo, sessionRepo, makeAssessmentRepo()).execute("attempt-1", "q1", "user-1", true);

        expect(result.errorValue()).toMatch(/^FORBIDDEN:/);
        expect(attemptRepo.setMarkedForReview).not.toHaveBeenCalled();
    });

    it("finalizes an expired attempt instead of changing it", async () => {
        const attemptRepo = makeAttemptRepo({ findById: jest.fn().mockResolvedValue(makeAttempt({ expiresAt: new Date(Date.now() - 1) })) });
        const result = await new MarkForReviewUseCase(attemptRepo, makeTestSessionRepo(), makeAssessmentRepo()).execute("attempt-1", "q1", "user-1", true);

        expect(result.errorValue()).toMatch(/^CONFLICT: This attempt has expired/);
        expect(attemptRepo.markTimedOut).toHaveBeenCalled();
        expect(attemptRepo.setMarkedForReview).not.toHaveBeenCalled();
    });

    it("rejects a question that is not part of the test", async () => {
        const attemptRepo = makeAttemptRepo({
            findById: jest.fn().mockResolvedValue(makeAttempt()),
            setMarkedForReview: jest.fn().mockResolvedValue(false),
        });
        const result = await new MarkForReviewUseCase(attemptRepo, makeTestSessionRepo(), makeAssessmentRepo()).execute("attempt-1", "other", "user-1", true);
        expect(result.errorValue()).toMatch(/^NOT_FOUND:/);
    });
});
