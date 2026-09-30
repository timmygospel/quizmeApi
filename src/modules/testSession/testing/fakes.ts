// Jest doubles for the testSession repositories, shared by use-case tests.
import { IAttemptRepository } from "../domain/IAttemptRepository";
import { ITestSessionRepository } from "../domain/ITestSessionRepository";
import { IAssessmentRepository } from "../../assessment/domain/IAssessmentRepository";
import { Attempt } from "../domain/Attempt";
import { TestSession } from "../domain/TestSession";
import { TestSessionParticipant } from "../domain/TestSessionParticipant";
import { ParticipantStatus } from "../domain/TestSessionParticipant";
import { Assessment } from "../../assessment/domain/Assessment";
import { AssessmentName } from "../../assessment/domain/valueObjects/AssessmentName";
import { AssessmentQuestion } from "../../assessment/domain/AssessmentQuestion";
import { AssessmentQuestionText } from "../../assessment/domain/valueObjects/AssessmentQuestionText";

export function makeSession(overrides: Partial<ConstructorParameters<typeof TestSession>[0]> = {}): TestSession {
    return new TestSession(
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
            ...overrides,
        },
        "session-1"
    );
}

export function makeParticipant(status: ParticipantStatus = "ASSIGNED", userId = "user-1"): TestSessionParticipant {
    return new TestSessionParticipant(
        {
            testSessionId: "session-1",
            userId,
            locationId: null,
            locationNameSnapshot: null,
            departmentId: null,
            departmentNameSnapshot: null,
            teamId: null,
            teamNameSnapshot: null,
            status,
        },
        "participant-1"
    );
}

export function makeAttempt(overrides: Partial<ConstructorParameters<typeof Attempt>[0]> = {}, id = "attempt-1"): Attempt {
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
        id
    );
}

export function makeAttemptRepo(overrides: Partial<IAttemptRepository> = {}): IAttemptRepository {
    return {
        findById: jest.fn().mockResolvedValue(null),
        countForParticipant: jest.fn().mockResolvedValue(0),
        create: jest.fn().mockImplementation(async (a: Attempt) => new Attempt(a.props, "attempt-new")),
        markSubmitted: jest.fn().mockImplementation(async (id: string, scorePercentage: number, passed: boolean) =>
            makeAttempt({ status: "SUBMITTED", scorePercentage, passed }, id)),
        markTimedOut: jest.fn().mockImplementation(async (id: string, scorePercentage: number, passed: boolean) =>
            makeAttempt({ status: "TIMED_OUT", scorePercentage, passed, expiresAt: new Date(0) }, id)),
        upsertResponse: jest.fn(),
        findResponses: jest.fn().mockResolvedValue([]),
        findInProgressForParticipant: jest.fn().mockResolvedValue(null),
        setMarkedForReview: jest.fn().mockResolvedValue(true),
        findExpiredInProgress: jest.fn().mockResolvedValue([]),
        ...overrides,
    };
}

export function makeTestSessionRepo(overrides: Partial<ITestSessionRepository> = {}): ITestSessionRepository {
    return {
        findById: jest.fn().mockResolvedValue(makeSession()),
        findAll: jest.fn(),
        create: jest.fn(),
        updateStatus: jest.fn(),
        resolveActiveUsers: jest.fn(),
        previewAudience: jest.fn(),
        findParticipantForUser: jest.fn().mockResolvedValue(makeParticipant()),
        findParticipantById: jest.fn().mockResolvedValue(makeParticipant("IN_PROGRESS")),
        updateParticipantStatus: jest.fn(),
        findMyTestSessions: jest.fn().mockResolvedValue([]),
        expireUnstartedParticipants: jest.fn().mockResolvedValue(undefined),
        getResults: jest.fn(),
        getQuestionAnalysis: jest.fn(),
        getAnalyticsBreakdown: jest.fn(),
        getParticipants: jest.fn(),
        getActivity: jest.fn().mockResolvedValue([]),
        ...overrides,
    };
}

/** An assessment with `questionCount` questions q0..qN, each with options q{i}-a (correct) and q{i}-b. */
export function makeAssessmentRepo(passMark = 50, questionCount = 2): IAssessmentRepository {
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
    return { findById: jest.fn().mockResolvedValue(assessment), findAll: jest.fn(), save: jest.fn() };
}
