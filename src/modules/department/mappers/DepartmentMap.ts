import { Department } from "../domain/Department";
import { DepartmentName } from "../domain/valueObjects/DepartmentName";
import { DepartmentDTO } from "../dtos/DepartmentDTO";

export interface DepartmentRow {
    id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}

export class DepartmentMap {
    public static toDTO(department: Department): DepartmentDTO {
        return {
            id: department.id,
            name: department.name,
        };
    }

    public static toDomain(row: DepartmentRow): Department {
        const nameOrError = DepartmentName.create(row.name);
        if (nameOrError.isFailure) {
            throw new Error(nameOrError.errorValue());
        }

        return new Department(
            {
                name: nameOrError.getValue(),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            },
            row.id
        );
    }

    public static toPersistence(department: Department): { name: string } {
        return {
            name: department.name,
        };
    }
}
