import { DuplicateAssessmentUseCase } from "./DuplicateAssessmentUseCase";
import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";
import { AssessmentName } from "../../../domain/valueObjects/AssessmentName";

function makeAssessment(): Assessment {
    return new Assessment({
        id: "assess-1",
        name: AssessmentName.create("Fire Safety Assessment").getValue(),
        description: "Covers fire hazards and exit procedures.",
        categoryId: "cat-1",
        categoryName: "Health & Safety",
        questionCount: 20,
        passMark: 70,
        maxAttempts: 3,
        durationMinutes: 30,
        status: "PUBLISHED",
        createdBy: "user-1",
        createdByName: "Sarah Johnson",
    });
}

function makeRepo(overrides: Partial<IAssessmentRepository> = {}): IAssessmentRepository {
    return {
        findById: jest.fn(),
        findAll: jest.fn(),
        save: jest.fn(async (a: Assessment) => new Assessment({ ...a, id: "assess-2" })),
        ...overrides,
    };
}

describe("DuplicateAssessmentUseCase", () => {
    it("creates a DRAFT copy with '(Copy)' appended to the name", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeAssessment()) });
        const useCase = new DuplicateAssessmentUseCase(repo);

        const result = await useCase.execute({ id: "assess-1", requestedBy: "user-2" });

        expect(result.isSuccess).toBe(true);
        const copy = result.getValue();
        expect(copy.name.value).toBe("Fire Safety Assessment (Copy)");
        expect(copy.status).toBe("DRAFT");
        expect(copy.passMark).toBe(70);
        expect(copy.categoryId).toBe("cat-1");
        expect(copy.createdBy).toBe("user-2");
    });

    it("fails when the original assessment does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new DuplicateAssessmentUseCase(repo);

        const result = await useCase.execute({ id: "missing", requestedBy: "user-2" });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ASSESSMENT_NOT_FOUND");
        expect(repo.save).not.toHaveBeenCalled();
    });
});
