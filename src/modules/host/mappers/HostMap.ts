import { Host } from "../domain/Host";
import { HostName } from "../domain/valueObjects/HostName";
import { HostDTO } from "../dtos/HostDTO";

export interface HostRow {
    id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}

export class HostMap {
    public static toDTO(host: Host): HostDTO {
        return {
            id: host.id,
            name: host.name,
        };
    }

    public static toDomain(row: HostRow): Host {
        const nameOrError = HostName.create(row.name);
        if (nameOrError.isFailure) {
            throw new Error(nameOrError.errorValue());
        }

        return new Host(
            {
                name: nameOrError.getValue(),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            },
            row.id
        );
    }

    public static toPersistence(host: Host): { name: string } {
        return {
            name: host.name,
        };
    }
}
