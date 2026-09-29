import { PublishAssessmentUseCase } from "./PublishAssessmentUseCase";
import { IAssessmentRepository } from "../../../domain/IAssessmentRepository";
import { Assessment } from "../../../domain/Assessment";
import { AssessmentName } from "../../../domain/valueObjects/AssessmentName";
import { AssessmentQuestion } from "../../../domain/AssessmentQuestion";
import { AssessmentOption } from "../../../domain/AssessmentOption";
import { AssessmentQuestionText } from "../../../domain/valueObjects/AssessmentQuestionText";
import { AssessmentOptionText } from "../../../domain/valueObjects/AssessmentOptionText";

function makeOption(text: string, correct: boolean): AssessmentOption {
    return new AssessmentOption({ text: AssessmentOptionText.create(text).getValue(), correct });
}

function makeQuestion(options: AssessmentOption[] = [makeOption("Yes", true), makeOption("No", false)]): AssessmentQuestion {
    return new AssessmentQuestion({
        id: "q-1",
        question: AssessmentQuestionText.create("Where is the nearest fire exit?").getValue(),
        options,
    });
}

function makeAssessment(
    status: Assessment["status"] = "DRAFT",
    questions: AssessmentQuestion[] | undefined = [makeQuestion()]
): Assessment {
    return new Assessment({
        id: "assess-1",
        name: AssessmentName.create("Fire Safety Assessment").getValue(),
        description: "",
        categoryId: null,
        categoryName: null,
        questionCount: questions?.length ?? 0,
        questions,
        passMark: 70,
        maxAttempts: 3,
        durationMinutes: 30,
        status,
        createdBy: "user-1",
        createdByName: "Sarah Johnson",
    });
}

function makeRepo(assessment: Assessment | null): IAssessmentRepository {
    return {
        findById: jest.fn().mockResolvedValue(assessment),
        findAll: jest.fn(),
        save: jest.fn(async (a: Assessment) => a),
    };
}

describe("PublishAssessmentUseCase", () => {
    it.each(["DRAFT", "APPROVED"] as const)("publishes a complete %s assessment", async (status) => {
        const repo = makeRepo(makeAssessment(status));

        const result = await new PublishAssessmentUseCase(repo).execute("assess-1");

        expect(result.isSuccess).toBe(true);
        expect(result.getValue().status).toBe("PUBLISHED");
        expect(repo.save).toHaveBeenCalledWith(expect.objectContaining({ status: "PUBLISHED" }));
    });

    it("fails when the assessment does not exist", async () => {
        const repo = makeRepo(null);
        const result = await new PublishAssessmentUseCase(repo).execute("missing");
        expect(result.errorValue()).toBe("ASSESSMENT_NOT_FOUND");
        expect(repo.save).not.toHaveBeenCalled();
    });

    it("rejects an already-published assessment", async () => {
        const repo = makeRepo(makeAssessment("PUBLISHED"));
        const result = await new PublishAssessmentUseCase(repo).execute("assess-1");
        expect(result.errorValue()).toBe("ASSESSMENT_ALREADY_PUBLISHED");
        expect(repo.save).not.toHaveBeenCalled();
    });

    it.each(["ARCHIVED", "IN_REVIEW"] as const)("rejects a %s assessment", async (status) => {
        const repo = makeRepo(makeAssessment(status));
        const result = await new PublishAssessmentUseCase(repo).execute("assess-1");
        expect(result.errorValue()).toBe("ASSESSMENT_NOT_PUBLISHABLE");
        expect(repo.save).not.toHaveBeenCalled();
    });

    it("rejects an assessment with no questions", async () => {
        const repo = makeRepo(makeAssessment("DRAFT", []));
        const result = await new PublishAssessmentUseCase(repo).execute("assess-1");
        expect(result.errorValue()).toBe("ASSESSMENT_HAS_NO_QUESTIONS");
        expect(repo.save).not.toHaveBeenCalled();
    });

    it("rejects a question with no correct answer", async () => {
        const repo = makeRepo(makeAssessment("DRAFT", [makeQuestion([makeOption("A", false), makeOption("B", false)])]));
        const result = await new PublishAssessmentUseCase(repo).execute("assess-1");
        expect(result.errorValue()).toBe("ASSESSMENT_HAS_INVALID_QUESTIONS");
        expect(repo.save).not.toHaveBeenCalled();
    });

    it("rejects a question with fewer than two options", async () => {
        const repo = makeRepo(makeAssessment("DRAFT", [makeQuestion([makeOption("A", true)])]));
        const result = await new PublishAssessmentUseCase(repo).execute("assess-1");
        expect(result.errorValue()).toBe("ASSESSMENT_HAS_INVALID_QUESTIONS");
    });
});
