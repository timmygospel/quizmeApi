import { Result } from "../../../../../shared/core/Result";
import { ILocationRepository } from "../../../domain/ILocationRepository";
import { DeleteLocationDTO } from "./DeleteLocationDTO";

export class DeleteLocationUseCase {
    constructor(private repo: ILocationRepository) { }

    async execute(dto: DeleteLocationDTO): Promise<Result<void>> {
        try {
            const existing = await this.repo.findById(dto.id);
            if (!existing) return Result.fail(`Location with id ${dto.id} not found`);

            if (await this.repo.isInUse(dto.id)) return Result.fail("LOCATION_IN_USE");

            await this.repo.delete(dto.id);
            return Result.ok();
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
