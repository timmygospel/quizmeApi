import { Location } from "../domain/Location";
import { LocationName } from "../domain/valueObjects/LocationName";
import { LocationDTO } from "../dtos/LocationDTO";

export interface LocationRow {
    id: string;
    name: string;
    created_at: Date;
    updated_at: Date;
}

export class LocationMap {
    public static toDTO(location: Location): LocationDTO {
        return {
            id: location.id,
            name: location.name,
        };
    }

    public static toDomain(row: LocationRow): Location {
        const nameOrError = LocationName.create(row.name);
        if (nameOrError.isFailure) {
            throw new Error(nameOrError.errorValue());
        }

        return new Location(
            {
                name: nameOrError.getValue(),
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            },
            row.id
        );
    }

    public static toPersistence(location: Location): { name: string } {
        return {
            name: location.name,
        };
    }
}
