import { GetParticipantsUseCase } from "./GetParticipantsUseCase";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { TestSession } from "../../../domain/TestSession";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ParticipantRowDTO } from "../../../dtos/TestSessionDTO";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";

const makeAttemptRepo = (overrides: Partial<IAttemptRepository> = {}) =>
    ({ findExpiredInProgress: jest.fn().mockResolvedValue([]), ...overrides } as unknown as IAttemptRepository);
const assessmentRepo = {} as unknown as IAssessmentRepository;

function makeTestSessionRepo(overrides: Partial<ITestSessionRepository> = {}): ITestSessionRepository {
    return {
        findById: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn(),
        updateStatus: jest.fn(),
        resolveActiveUsers: jest.fn(),
        previewAudience: jest.fn(),
        findParticipantForUser: jest.fn(),
        findParticipantById: jest.fn(),
        updateParticipantStatus: jest.fn(),
        findMyTestSessions: jest.fn(),
        expireUnstartedParticipants: jest.fn().mockResolvedValue(undefined),
        getResults: jest.fn(),
        getAnalyticsBreakdown: jest.fn(),
        getParticipants: jest.fn(),
        getActivity: jest.fn().mockResolvedValue([]),
        ...overrides,
    };
}

function session(overrides: Partial<{ ownerId: string }> = {}): TestSession {
    return new TestSession(
        {
            assessmentId: "assessment-1",
            name: "Q3 Sales Skills",
            ownerId: overrides.ownerId ?? "owner-1",
            availableFrom: new Date("2026-01-01T09:00:00Z"),
            availableUntil: new Date("2026-01-01T17:00:00Z"),
            timeLimitMinutes: 30,
            maxAttempts: 1,
            status: "OPEN",
            audience: [{ locationId: "birmingham", departmentId: "sales" }],
        },
        "session-1"
    );
}

const rows: ParticipantRowDTO[] = [
    {
        id: "p1", userId: "u1", name: "Alex Kim", location: "Birmingham", department: "Sales", team: null,
        status: "COMPLETED", assignedAt: "2026-01-01T00:00:00Z", startedAt: "2026-01-01T09:05:00Z",
        completedAt: "2026-01-01T09:20:00Z", scorePercentage: 85, passed: true,
    },
];

describe("GetParticipantsUseCase", () => {
    it("returns the participant rows for a session within scope", async () => {
        const repo = makeTestSessionRepo({
            findById: jest.fn().mockResolvedValue(session()),
            getParticipants: jest.fn().mockResolvedValue(rows),
        });
        const useCase = new GetParticipantsUseCase(repo, makeAttemptRepo(), assessmentRepo);

        const result = await useCase.execute("session-1");

        expect(result.isSuccess).toBe(true);
        expect(result.getValue()).toEqual(rows);
        expect(repo.getParticipants).toHaveBeenCalledWith("session-1");
    });

    it("fails NOT_FOUND when the session doesn't exist", async () => {
        const repo = makeTestSessionRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new GetParticipantsUseCase(repo, makeAttemptRepo(), assessmentRepo);

        const result = await useCase.execute("missing-session");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toMatch(/^NOT_FOUND:/);
        expect(repo.getParticipants).not.toHaveBeenCalled();
    });

    it("fails NOT_FOUND when the session falls outside the caller's scope", async () => {
        const repo = makeTestSessionRepo({ findById: jest.fn().mockResolvedValue(session({ ownerId: "someone-else" })) });
        const useCase = new GetParticipantsUseCase(repo, makeAttemptRepo(), assessmentRepo);
        const scope: EffectiveScope = { type: "SELF", userId: "caller-1", allLocations: false, locationIds: [], departmentIds: [] };

        const result = await useCase.execute("session-1", scope);

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toMatch(/^NOT_FOUND:/);
        expect(repo.getParticipants).not.toHaveBeenCalled();
    });

    it("finalizes abandoned attempts and no-shows before listing participants", async () => {
        const order: string[] = [];
        const repo = makeTestSessionRepo({
            findById: jest.fn().mockResolvedValue(session()),
            expireUnstartedParticipants: jest.fn().mockImplementation(async () => { order.push("expire"); }),
            getParticipants: jest.fn().mockImplementation(async () => { order.push("read"); return rows; }),
        });
        const attemptRepo = makeAttemptRepo({
            findExpiredInProgress: jest.fn().mockImplementation(async () => { order.push("findExpired"); return []; }),
        });

        await new GetParticipantsUseCase(repo, attemptRepo, assessmentRepo).execute("session-1");

        expect(attemptRepo.findExpiredInProgress).toHaveBeenCalledWith(["session-1"], expect.any(Date));
        expect(order).toEqual(["findExpired", "expire", "read"]);
    });
});
