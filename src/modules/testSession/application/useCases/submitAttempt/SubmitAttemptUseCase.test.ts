import { SubmitAttemptUseCase } from "./SubmitAttemptUseCase";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { Attempt } from "../../../domain/Attempt";
import { AttemptResponse } from "../../../domain/AttemptResponse";
import { TestSessionParticipant } from "../../../domain/TestSessionParticipant";
import { TestSession } from "../../../domain/TestSession";
import { Assessment } from "../../../../assessment/domain/Assessment";
import { AssessmentName } from "../../../../assessment/domain/valueObjects/AssessmentName";
import { AssessmentQuestion } from "../../../../assessment/domain/AssessmentQuestion";
import { AssessmentQuestionText } from "../../../../assessment/domain/valueObjects/AssessmentQuestionText";

function makeAttemptRepo(overrides: Partial<IAttemptRepository> = {}): IAttemptRepository {
    return {
        findById: jest.fn(),
        countForParticipant: jest.fn(),
        create: jest.fn(),
        markSubmitted: jest.fn().mockImplementation(async (id, scorePercentage, passed) =>
            new Attempt({
                testSessionId: "session-1",
                testSessionParticipantId: "participant-1",
                attemptNumber: 1,
                startedAt: new Date(),
                expiresAt: new Date(Date.now() + 100_000),
                status: "SUBMITTED",
                scorePercentage,
                passed,
            }, id)
        ),
        markTimedOut: jest.fn().mockImplementation(async (id, scorePercentage, passed) =>
            new Attempt({
                testSessionId: "session-1",
                testSessionParticipantId: "participant-1",
                attemptNumber: 1,
                startedAt: new Date(),
                expiresAt: new Date(0),
                status: "TIMED_OUT",
                scorePercentage,
                passed,
            }, id)
        ),
        upsertResponse: jest.fn(),
        findResponses: jest.fn().mockResolvedValue([]),
        ...overrides,
    };
}

function makeTestSessionRepo(overrides: Partial<ITestSessionRepository> = {}): ITestSessionRepository {
    const session = new TestSession(
        {
            assessmentId: "assessment-1",
            name: "Q3 Sales Skills",
            ownerId: "owner-1",
            availableFrom: new Date(Date.now() - 100_000),
            availableUntil: new Date(Date.now() + 1_000_000),
            timeLimitMinutes: 30,
            maxAttempts: 1,
            status: "OPEN",
            audience: [],
        },
        "session-1"
    );

    const participant = new TestSessionParticipant(
        {
            testSessionId: "session-1",
            userId: "user-1",
            locationId: null,
            locationNameSnapshot: null,
            departmentId: null,
            departmentNameSnapshot: null,
            teamId: null,
            teamNameSnapshot: null,
            status: "IN_PROGRESS",
        },
        "participant-1"
    );

    return {
        findById: jest.fn().mockResolvedValue(session),
        findAll: jest.fn(),
        create: jest.fn(),
        updateStatus: jest.fn(),
        resolveActiveUsers: jest.fn(),
        previewAudience: jest.fn(),
        findParticipantForUser: jest.fn(),
        findParticipantById: jest.fn().mockResolvedValue(participant),
        updateParticipantStatus: jest.fn(),
        findMyTestSessions: jest.fn(),
        getResults: jest.fn(),
        getAnalyticsBreakdown: jest.fn(),
        ...overrides,
    };
}

function makeAssessmentRepo(passMark: number, questionCount: number): IAssessmentRepository {
    const questions = Array.from({ length: questionCount }, (_, i) =>
        new AssessmentQuestion({ id: `q${i}`, question: AssessmentQuestionText.create(`Question ${i}`).getValue(), options: [] })
    );
    const assessment = new Assessment({
        name: AssessmentName.create("Sales Skills").getValue(),
        description: "",
        categoryId: null,
        categoryName: null,
        questionCount,
        questions,
        passMark,
        maxAttempts: 1,
        durationMinutes: 30,
        status: "PUBLISHED",
        createdBy: null,
        createdByName: null,
    });

    return {
        findById: jest.fn().mockResolvedValue(assessment),
        findAll: jest.fn(),
        save: jest.fn(),
    };
}

function inProgressAttempt(overrides: Partial<ConstructorParameters<typeof Attempt>[0]> = {}): Attempt {
    return new Attempt(
        {
            testSessionId: "session-1",
            testSessionParticipantId: "participant-1",
            attemptNumber: 1,
            startedAt: new Date(Date.now() - 1000),
            expiresAt: new Date(Date.now() + 100_000),
            status: "IN_PROGRESS",
            scorePercentage: null,
            passed: null,
            ...overrides,
        },
        "attempt-1"
    );
}

describe("SubmitAttemptUseCase", () => {
    it("scores the attempt, marks it submitted, and completes the participant", async () => {
        const attemptRepo = makeAttemptRepo({
            findById: jest.fn().mockResolvedValue(inProgressAttempt()),
            findResponses: jest.fn().mockResolvedValue([
                new AttemptResponse({ testAttemptId: "attempt-1", assessmentQuestionId: "q0", selectedOptionId: "o1", isCorrect: true }),
                new AttemptResponse({ testAttemptId: "attempt-1", assessmentQuestionId: "q1", selectedOptionId: "o2", isCorrect: false }),
            ]),
        });
        const testSessionRepo = makeTestSessionRepo();
        const useCase = new SubmitAttemptUseCase(attemptRepo, testSessionRepo, makeAssessmentRepo(50, 2));

        const result = await useCase.execute("attempt-1", "user-1");

        expect(result.isSuccess).toBe(true);
        expect(attemptRepo.markSubmitted).toHaveBeenCalledWith("attempt-1", 50, true, expect.any(Date));
        expect(testSessionRepo.updateParticipantStatus).toHaveBeenCalledWith("participant-1", "COMPLETED", expect.any(Object));
    });

    it("finalizes as TIMED_OUT instead of submitting once expires_at has passed", async () => {
        const attemptRepo = makeAttemptRepo({
            findById: jest.fn().mockResolvedValue(inProgressAttempt({ expiresAt: new Date(0) })),
            findResponses: jest.fn().mockResolvedValue([]),
        });
        const testSessionRepo = makeTestSessionRepo();
        const useCase = new SubmitAttemptUseCase(attemptRepo, testSessionRepo, makeAssessmentRepo(50, 2));

        const result = await useCase.execute("attempt-1", "user-1");

        expect(result.isSuccess).toBe(true);
        expect(result.getValue().status).toBe("TIMED_OUT");
        expect(attemptRepo.markSubmitted).not.toHaveBeenCalled();
        expect(testSessionRepo.updateParticipantStatus).toHaveBeenCalledWith("participant-1", "TIMED_OUT", expect.any(Object));
    });

    it("rejects when the attempt does not belong to the caller", async () => {
        const attemptRepo = makeAttemptRepo({ findById: jest.fn().mockResolvedValue(inProgressAttempt()) });
        const useCase = new SubmitAttemptUseCase(attemptRepo, makeTestSessionRepo(), makeAssessmentRepo(50, 2));

        const result = await useCase.execute("attempt-1", "someone-else");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toMatch(/^FORBIDDEN:/);
    });

    it("rejects re-submitting an already-finalized attempt", async () => {
        const attemptRepo = makeAttemptRepo({
            findById: jest.fn().mockResolvedValue(inProgressAttempt({ status: "SUBMITTED" })),
        });
        const useCase = new SubmitAttemptUseCase(attemptRepo, makeTestSessionRepo(), makeAssessmentRepo(50, 2));

        const result = await useCase.execute("attempt-1", "user-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toMatch(/^CONFLICT:/);
    });
});
