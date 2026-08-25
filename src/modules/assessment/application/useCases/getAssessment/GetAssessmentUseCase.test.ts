import { GetAssessmentUseCase } from "./GetAssessmentUseCase";
import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";
import { AssessmentName } from "../../../domain/valueObjects/AssessmentName";

function makeAssessment(): Assessment {
    return new Assessment({
        id: "assess-1",
        name: AssessmentName.create("Fire Safety Assessment").getValue(),
        description: "",
        categoryId: null,
        categoryName: null,
        questionCount: 0,
        questions: [],
        passMark: 70,
        maxAttempts: null,
        durationMinutes: null,
        status: "DRAFT",
        createdBy: null,
        createdByName: null,
    });
}

function makeRepo(overrides: Partial<IAssessmentRepository> = {}): IAssessmentRepository {
    return {
        findById: jest.fn(),
        findAll: jest.fn(),
        save: jest.fn(),
        ...overrides,
    };
}

describe("GetAssessmentUseCase", () => {
    it("returns the assessment with its questions", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeAssessment()) });
        const useCase = new GetAssessmentUseCase(repo);

        const result = await useCase.execute("assess-1");

        expect(result.isSuccess).toBe(true);
        expect(result.getValue().questions).toEqual([]);
    });

    it("fails when the assessment does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new GetAssessmentUseCase(repo);

        const result = await useCase.execute("missing");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ASSESSMENT_NOT_FOUND");
    });
});
