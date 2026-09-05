import { CreateTestSessionUseCase } from "./CreateTestSessionUseCase";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { Assessment } from "../../../../assessment/domain/Assessment";
import { AssessmentName } from "../../../../assessment/domain/valueObjects/AssessmentName";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { TestSession } from "../../../domain/TestSession";
import { CreateTestSessionDTO } from "./CreateTestSessionDTO";

function makeTestSessionRepo(overrides: Partial<ITestSessionRepository> = {}): ITestSessionRepository {
    return {
        findById: jest.fn(),
        findAll: jest.fn(),
        create: jest.fn().mockImplementation(async (session: TestSession) => new TestSession(session.props, "session-1")),
        updateStatus: jest.fn(),
        resolveActiveUsers: jest.fn().mockResolvedValue([]),
        previewAudience: jest.fn(),
        findParticipantForUser: jest.fn(),
        findParticipantById: jest.fn(),
        updateParticipantStatus: jest.fn(),
        findMyTestSessions: jest.fn(),
        getResults: jest.fn(),
        getAnalyticsBreakdown: jest.fn(),
        ...overrides,
    };
}

function publishedAssessment(): Assessment {
    return new Assessment({
        name: AssessmentName.create("Sales Skills").getValue(),
        description: "",
        categoryId: null,
        categoryName: null,
        questionCount: 5,
        passMark: 70,
        maxAttempts: 1,
        durationMinutes: 30,
        status: "PUBLISHED",
        createdBy: null,
        createdByName: null,
    });
}

function makeAssessmentRepo(overrides: Partial<IAssessmentRepository> = {}): IAssessmentRepository {
    return {
        findById: jest.fn().mockResolvedValue(publishedAssessment()),
        findAll: jest.fn(),
        save: jest.fn(),
        ...overrides,
    };
}

function baseDto(): CreateTestSessionDTO {
    return {
        assessmentId: "assessment-1",
        name: "Q3 Sales Skills",
        availableFrom: "2026-01-01T09:00:00Z",
        availableUntil: "2026-01-01T17:00:00Z",
        timeLimitMinutes: 30,
        maxAttempts: 1,
        audience: [{ locationId: "birmingham", departmentId: "sales" }],
    };
}

describe("CreateTestSessionUseCase", () => {
    it("creates a Test Session and resolves the audience into participants", async () => {
        const testSessionRepo = makeTestSessionRepo({
            resolveActiveUsers: jest.fn().mockResolvedValue([
                { userId: "u1", locationId: "birmingham", locationName: "Birmingham", departmentId: "sales", departmentName: "Sales" },
            ]),
        });
        const useCase = new CreateTestSessionUseCase(testSessionRepo, makeAssessmentRepo());

        const result = await useCase.execute(baseDto(), "owner-1");

        expect(result.isSuccess).toBe(true);
        expect(testSessionRepo.create).toHaveBeenCalledWith(
            expect.any(TestSession),
            [
                expect.objectContaining({ userId: "u1", locationId: "birmingham", departmentId: "sales" }),
            ]
        );
    });

    it("rejects when the assessment is not published", async () => {
        const assessmentRepo = makeAssessmentRepo({
            findById: jest.fn().mockResolvedValue(new Assessment({
                name: AssessmentName.create("Draft Assessment").getValue(),
                description: "",
                categoryId: null,
                categoryName: null,
                questionCount: 0,
                passMark: 70,
                maxAttempts: null,
                durationMinutes: null,
                status: "DRAFT",
                createdBy: null,
                createdByName: null,
            })),
        });
        const useCase = new CreateTestSessionUseCase(makeTestSessionRepo(), assessmentRepo);

        const result = await useCase.execute(baseDto(), "owner-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toMatch(/published/i);
    });

    it("rejects an audience rule outside the caller's scope", async () => {
        const useCase = new CreateTestSessionUseCase(makeTestSessionRepo(), makeAssessmentRepo());
        const scope: EffectiveScope = {
            type: "SCOPED",
            userId: "owner-1",
            allLocations: false,
            locationIds: ["london"],
            departmentIds: ["finance"],
        };

        const result = await useCase.execute(baseDto(), "owner-1", scope);

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toMatch(/^FORBIDDEN:/);
    });

    it("rejects when availableUntil is not after availableFrom", async () => {
        const useCase = new CreateTestSessionUseCase(makeTestSessionRepo(), makeAssessmentRepo());
        const dto = { ...baseDto(), availableFrom: "2026-01-01T17:00:00Z", availableUntil: "2026-01-01T09:00:00Z" };

        const result = await useCase.execute(dto, "owner-1");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toMatch(/availableUntil/);
    });

    it("rejects an empty audience", async () => {
        const useCase = new CreateTestSessionUseCase(makeTestSessionRepo(), makeAssessmentRepo());

        const result = await useCase.execute({ ...baseDto(), audience: [] }, "owner-1");

        expect(result.isFailure).toBe(true);
    });
});
