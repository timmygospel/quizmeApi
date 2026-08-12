import { Result } from "../../../../../shared/core/Result";
import { IDepartmentRepository } from "../../../domain/IDepartmentRepository";
import { Department } from "../../../domain/Department";

export class GetAllDepartmentsUseCase {
    constructor(private repo: IDepartmentRepository) { }

    async execute(): Promise<Result<Department[]>> {
        try {
            const departments = await this.repo.findAll();
            return Result.ok(departments);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
