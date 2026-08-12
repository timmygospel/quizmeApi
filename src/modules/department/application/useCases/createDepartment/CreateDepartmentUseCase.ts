import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";
import { IDepartmentRepository } from "../../../domain/IDepartmentRepository";
import { Department } from "../../../domain/Department";
import { DepartmentName } from "../../../domain/valueObjects/DepartmentName";
import { CreateDepartmentDTO } from "./CreateDepartmentDTO";

export class CreateDepartmentUseCase implements UseCase<CreateDepartmentDTO, Promise<Result<Department>>> {
    constructor(private repo: IDepartmentRepository) { }

    async execute(dto: CreateDepartmentDTO): Promise<Result<Department>> {
        try {
            const nameOrError = DepartmentName.create(dto.name);
            if (nameOrError.isFailure) return Result.fail(nameOrError.errorValue());

            const department = new Department({ name: nameOrError.getValue() });

            const saved = await this.repo.save(department);
            return Result.ok(saved);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
