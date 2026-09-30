import { finalizeExpiredForSessions } from "./finalizeExpiredForSessions";
import { makeAttempt, makeAttemptRepo, makeAssessmentRepo, makeTestSessionRepo } from "../../../testing/fakes";

describe("finalizeExpiredForSessions", () => {
    it("times out each expired attempt, then expires no-shows", async () => {
        const expired = [
            makeAttempt({ expiresAt: new Date(Date.now() - 5000) }, "a1"),
            makeAttempt({ expiresAt: new Date(Date.now() - 5000) }, "a2"),
        ];
        const attemptRepo = makeAttemptRepo({ findExpiredInProgress: jest.fn().mockResolvedValue(expired) });
        const testSessionRepo = makeTestSessionRepo();
        const now = new Date();

        await finalizeExpiredForSessions(["session-1"], { attemptRepo, testSessionRepo, assessmentRepo: makeAssessmentRepo() }, now);

        expect(attemptRepo.findExpiredInProgress).toHaveBeenCalledWith(["session-1"], now);
        expect(attemptRepo.markTimedOut).toHaveBeenCalledTimes(2);
        expect(testSessionRepo.updateParticipantStatus).toHaveBeenCalledWith("participant-1", "TIMED_OUT", expect.anything());
        expect(testSessionRepo.expireUnstartedParticipants).toHaveBeenCalledWith(["session-1"], now);
    });

    it("leaves the participant alone when another request already finalized the attempt", async () => {
        const attemptRepo = makeAttemptRepo({
            findExpiredInProgress: jest.fn().mockResolvedValue([makeAttempt({ expiresAt: new Date(Date.now() - 5000) })]),
            // the conditional UPDATE matched nothing: the attempt had just been submitted
            markTimedOut: jest.fn().mockResolvedValue(makeAttempt({ status: "SUBMITTED", scorePercentage: 100, passed: true })),
        });
        const testSessionRepo = makeTestSessionRepo();

        await finalizeExpiredForSessions(["session-1"], { attemptRepo, testSessionRepo, assessmentRepo: makeAssessmentRepo() });

        expect(testSessionRepo.updateParticipantStatus).not.toHaveBeenCalled();
    });

    it("does nothing for an empty list", async () => {
        const attemptRepo = makeAttemptRepo();
        await finalizeExpiredForSessions([], { attemptRepo, testSessionRepo: makeTestSessionRepo(), assessmentRepo: makeAssessmentRepo() });
        expect(attemptRepo.findExpiredInProgress).not.toHaveBeenCalled();
    });
});
