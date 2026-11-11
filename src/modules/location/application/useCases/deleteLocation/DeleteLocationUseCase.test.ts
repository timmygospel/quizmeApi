import { DeleteLocationUseCase } from "./DeleteLocationUseCase";
import { ILocationRepository } from "../../../domain/ILocationRepository";

function makeRepo(inUse: boolean, exists = true): ILocationRepository {
    return {
        findById: jest.fn().mockResolvedValue(exists ? ({ id: "loc-1" } as any) : null),
        findAll: jest.fn(),
        save: jest.fn(),
        isInUse: jest.fn().mockResolvedValue(inUse),
        delete: jest.fn(),
    };
}

describe("DeleteLocationUseCase", () => {
    it("deletes a location nothing references", async () => {
        const repo = makeRepo(false);
        const result = await new DeleteLocationUseCase(repo).execute({ id: "loc-1" });
        expect(result.isSuccess).toBe(true);
        expect(repo.delete).toHaveBeenCalledWith("loc-1");
    });

    it("refuses to delete a location that is still in use", async () => {
        const repo = makeRepo(true);
        const result = await new DeleteLocationUseCase(repo).execute({ id: "loc-1" });
        expect(result.isFailure).toBe(true);
        expect(result.errorValue()).toBe("LOCATION_IN_USE");
        expect(repo.delete).not.toHaveBeenCalled();
    });

    it("fails for an unknown location", async () => {
        const repo = makeRepo(false, false);
        const result = await new DeleteLocationUseCase(repo).execute({ id: "nope" });
        expect(result.isFailure).toBe(true);
        expect(repo.delete).not.toHaveBeenCalled();
    });
});
