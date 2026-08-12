import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";

import { IDepartmentRepository } from "../../../domain/IDepartmentRepository";
import { Department } from "../../../domain/Department";
import { DepartmentName } from "../../../domain/valueObjects/DepartmentName";
import { UpdateDepartmentDTO } from "./UpdateDepartmentDTO";

export class UpdateDepartmentUseCase
    implements UseCase<UpdateDepartmentDTO, Promise<Result<Department>>> {
    constructor(private repo: IDepartmentRepository) { }

    async execute(dto: UpdateDepartmentDTO): Promise<Result<Department>> {
        try {
            const existing = await this.repo.findById(dto.id);
            if (!existing) {
                return Result.fail<Department>(`Department with id ${dto.id} not found`);
            }

            const nameOrError = DepartmentName.create(dto.name);
            if (nameOrError.isFailure) return Result.fail<Department>(nameOrError.errorValue());

            const updated = new Department(
                {
                    ...existing.props,
                    name: nameOrError.getValue(),
                },
                dto.id
            );

            const saved = await this.repo.save(updated);
            return Result.ok(saved);
        } catch (err) {
            return Result.fail<Department>(err instanceof Error ? err.message : String(err));
        }
    }
}
