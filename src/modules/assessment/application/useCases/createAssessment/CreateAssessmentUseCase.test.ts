import { CreateAssessmentUseCase } from "./CreateAssessmentUseCase";
import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";
import { AssessmentName } from "../../../domain/valueObjects/AssessmentName";

function makeRepo(overrides: Partial<IAssessmentRepository> = {}): IAssessmentRepository {
    return {
        findById: jest.fn(),
        findAll: jest.fn(),
        save: jest.fn(async (a: Assessment) => new Assessment({ ...a, id: a.id ?? "new-id" })),
        ...overrides,
    };
}

describe("CreateAssessmentUseCase", () => {
    it("creates a DRAFT assessment with a valid pass mark", async () => {
        const repo = makeRepo();
        const useCase = new CreateAssessmentUseCase(repo);

        const result = await useCase.execute({
            name: "Fire Safety Assessment",
            passMark: 70,
            createdBy: "user-1",
        });

        expect(result.isSuccess).toBe(true);
        const saved = result.getValue();
        expect(saved.status).toBe("DRAFT");
        expect(saved.passMark).toBe(70);
        expect(saved.maxAttempts).toBeNull();
        expect(saved.durationMinutes).toBeNull();
        expect(repo.save).toHaveBeenCalled();
    });

    it("rejects an empty name", async () => {
        const repo = makeRepo();
        const useCase = new CreateAssessmentUseCase(repo);

        const result = await useCase.execute({ name: "  ", passMark: 70, createdBy: null });

        expect(result.isFailure).toBe(true);
        expect(repo.save).not.toHaveBeenCalled();
    });

    it.each([-1, 101])("rejects a pass mark of %d (outside 0-100)", async (passMark) => {
        const repo = makeRepo();
        const useCase = new CreateAssessmentUseCase(repo);

        const result = await useCase.execute({ name: "Fire Safety", passMark, createdBy: null });

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("Pass mark must be between 0% and 100%");
        expect(repo.save).not.toHaveBeenCalled();
    });

    it("rejects zero/negative max attempts", async () => {
        const repo = makeRepo();
        const useCase = new CreateAssessmentUseCase(repo);

        const result = await useCase.execute({ name: "Fire Safety", passMark: 70, maxAttempts: 0, createdBy: null });

        expect(result.isFailure).toBe(true);
        expect(repo.save).not.toHaveBeenCalled();
    });

    it("rejects zero/negative time limits", async () => {
        const repo = makeRepo();
        const useCase = new CreateAssessmentUseCase(repo);

        const result = await useCase.execute({ name: "Fire Safety", passMark: 70, durationMinutes: 0, createdBy: null });

        expect(result.isFailure).toBe(true);
        expect(repo.save).not.toHaveBeenCalled();
    });
});
