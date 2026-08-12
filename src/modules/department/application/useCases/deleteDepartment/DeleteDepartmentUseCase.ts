import { Result } from "../../../../../shared/core/Result";
import { IDepartmentRepository } from "../../../domain/IDepartmentRepository";
import { DeleteDepartmentDTO } from "./DeleteDepartmentDTO";

export class DeleteDepartmentUseCase {
    constructor(private repo: IDepartmentRepository) { }

    async execute(dto: DeleteDepartmentDTO): Promise<Result<void>> {
        try {
            const existing = await this.repo.findById(dto.id);
            if (!existing) return Result.fail(`Department with id ${dto.id} not found`);

            await this.repo.delete(dto.id);
            return Result.ok();
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
