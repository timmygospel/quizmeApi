import { Role, RoleType } from "../domain/Role";
import { RoleDTO } from "../dtos/RoleDTO";

export interface RoleRow {
    id: string;
    code: string;
    name: string;
    description: string;
    type: string;
    user_count: string; // COUNT(*) comes back as text over the wire
    created_at: Date;
    updated_at: Date;
}

export class RoleMap {
    public static toDTO(role: Role): RoleDTO {
        return {
            id: role.id,
            code: role.code,
            name: role.name,
            description: role.description,
            type: role.type,
            userCount: role.userCount,
            createdAt: role.createdAt?.toISOString(),
            updatedAt: role.updatedAt?.toISOString(),
        };
    }

    public static toDomain(row: RoleRow): Role {
        return new Role(
            {
                code: row.code,
                name: row.name,
                description: row.description,
                type: row.type as RoleType,
                userCount: parseInt(row.user_count, 10),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            },
            row.id
        );
    }
}
