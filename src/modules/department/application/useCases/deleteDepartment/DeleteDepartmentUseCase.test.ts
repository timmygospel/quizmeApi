import { DeleteDepartmentUseCase } from "./DeleteDepartmentUseCase";
import { IDepartmentRepository } from "../../../domain/IDepartmentRepository";

function makeRepo(inUse: boolean, exists = true): IDepartmentRepository {
    return {
        findById: jest.fn().mockResolvedValue(exists ? ({ id: "dept-1" } as any) : null),
        findAll: jest.fn(),
        save: jest.fn(),
        isInUse: jest.fn().mockResolvedValue(inUse),
        delete: jest.fn(),
    };
}

describe("DeleteDepartmentUseCase", () => {
    it("deletes a department nothing references", async () => {
        const repo = makeRepo(false);
        const result = await new DeleteDepartmentUseCase(repo).execute({ id: "dept-1" });
        expect(result.isSuccess).toBe(true);
        expect(repo.delete).toHaveBeenCalledWith("dept-1");
    });

    it("refuses to delete a department that is still in use", async () => {
        const repo = makeRepo(true);
        const result = await new DeleteDepartmentUseCase(repo).execute({ id: "dept-1" });
        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("DEPARTMENT_IN_USE");
        expect(repo.delete).not.toHaveBeenCalled();
    });

    it("fails for an unknown department", async () => {
        const repo = makeRepo(false, false);
        const result = await new DeleteDepartmentUseCase(repo).execute({ id: "nope" });
        expect(result.isFailure).toBe(true);
        expect(repo.delete).not.toHaveBeenCalled();
    });
});
