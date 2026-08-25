import { UpdateAssessmentUseCase } from "./UpdateAssessmentUseCase";
import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";
import { AssessmentName } from "../../../domain/valueObjects/AssessmentName";

function makeAssessment(status: Assessment["status"] = "DRAFT"): Assessment {
    return new Assessment({
        id: "assess-1",
        name: AssessmentName.create("Fire Safety Assessment").getValue(),
        description: "Old description",
        categoryId: null,
        categoryName: null,
        questionCount: 0,
        questions: [],
        passMark: 70,
        maxAttempts: null,
        durationMinutes: null,
        status,
        createdBy: "user-1",
        createdByName: "Sarah Johnson",
    });
}

function makeRepo(overrides: Partial<IAssessmentRepository> = {}): IAssessmentRepository {
    return {
        findById: jest.fn().mockResolvedValue(makeAssessment()),
        findAll: jest.fn(),
        save: jest.fn(async (a: Assessment) => a),
        ...overrides,
    };
}

const VALID_DTO = {
    id: "assess-1",
    name: "Fire Safety Assessment",
    description: "Covers fire hazards.",
    passMark: 80,
    maxAttempts: 3,
    durationMinutes: 30,
    questions: [
        { question: "What is fire?", options: [{ text: "Heat, fuel, oxygen", correct: true }, { text: "Water", correct: false }] },
    ],
};

describe("UpdateAssessmentUseCase", () => {
    it("replaces details, pass criteria and questions", async () => {
        const repo = makeRepo();
        const useCase = new UpdateAssessmentUseCase(repo);

        const result = await useCase.execute(VALID_DTO);

        expect(result.isSuccess).toBe(true);
        const saved = result.getValue();
        expect(saved.passMark).toBe(80);
        expect(saved.maxAttempts).toBe(3);
        expect(saved.durationMinutes).toBe(30);
        expect(saved.questions).toHaveLength(1);
        expect(saved.questions![0].question.value).toBe("What is fire?");
        expect(repo.save).toHaveBeenCalled();
    });

    it("fails when the assessment does not exist", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(null) });
        const useCase = new UpdateAssessmentUseCase(repo);

        const result = await useCase.execute(VALID_DTO);

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ASSESSMENT_NOT_FOUND");
        expect(repo.save).not.toHaveBeenCalled();
    });

    it("refuses to edit a Published assessment", async () => {
        const repo = makeRepo({ findById: jest.fn().mockResolvedValue(makeAssessment("PUBLISHED")) });
        const useCase = new UpdateAssessmentUseCase(repo);

        const result = await useCase.execute(VALID_DTO);

        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("ASSESSMENT_PUBLISHED_IMMUTABLE");
        expect(repo.save).not.toHaveBeenCalled();
    });

    it.each([-1, 101])("rejects a pass mark of %d", async (passMark) => {
        const repo = makeRepo();
        const useCase = new UpdateAssessmentUseCase(repo);

        const result = await useCase.execute({ ...VALID_DTO, passMark });

        expect(result.isFailure).toBe(true);
        expect(repo.save).not.toHaveBeenCalled();
    });

    it("rejects zero/negative max attempts", async () => {
        const repo = makeRepo();
        const useCase = new UpdateAssessmentUseCase(repo);

        const result = await useCase.execute({ ...VALID_DTO, maxAttempts: 0 });

        expect(result.isFailure).toBe(true);
        expect(repo.save).not.toHaveBeenCalled();
    });
});
