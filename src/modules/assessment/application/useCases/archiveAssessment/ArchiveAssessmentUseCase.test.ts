import { ArchiveAssessmentUseCase } from "./ArchiveAssessmentUseCase";
import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";
import { AssessmentName } from "../../../domain/valueObjects/AssessmentName";

function makeAssessment(status: Assessment["status"] = "PUBLISHED"): Assessment {
    return new Assessment({
        id: "assess-1",
        name: AssessmentName.create("Fire Safety Assessment").getValue(),
        description: "",
        categoryId: null,
        categoryName: null,
        questionCount: 20,
        passMark: 70,
        maxAttempts: 3,
        durationMinutes: 30,
        status,
        createdBy: "user-1",
        createdByName: "Sarah Johnson",
    });
}

function makeRepo(overrides: Partial<IAssessmentRepository> = {}): IAssessmentRepository {
    return {
        findById: jest.fn(),
        findAll: jest.fn(),
        save: jest.fn(async (a: Assessment) => a),
        ...overrides,
    };
}

describe("ArchiveAssessmentUseCase", () => {
    it("archives an existing assessment", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeAssessment("PUBLISHED")) });
        const useCase = new ArchiveAssessmentUseCase(repo);

        const result = await useCase.execute("assess-1");

        expect(result.isSuccess).toBe(true);
        expect(result.getValue().status).toBe("ARCHIVED");
        expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: "ARCHIVED" }));
    });

    it("fails when the assessment does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new ArchiveAssessmentUseCase(repo);

        const result = await useCase.execute("missing");

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ASSESSMENT_NOT_FOUND");
        expect(repo.save).not.toHaveBeenCalled();
    });
});
