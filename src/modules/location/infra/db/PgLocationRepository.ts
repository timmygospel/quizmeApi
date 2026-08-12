import { ILocationRepository } from "../../domain/ILocationRepository";
import { Location } from "../../domain/Location";
import { LocationMap, LocationRow } from "../../mappers/LocationMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

export class PgLocationRepository implements ILocationRepository {
    async findById(id: string): Promise<Location | null> {
        const { rows } = await pgPool.query<LocationRow>(
            "SELECT * FROM locations WHERE id = $1",
            [id]
        );
        return rows[0] ? LocationMap.toDomain(rows[0]) : null;
    }

    async findAll(): Promise<Location[]> {
        const { rows } = await pgPool.query<LocationRow>(
            "SELECT * FROM locations ORDER BY name ASC"
        );
        return rows.map((r) => LocationMap.toDomain(r));
    }

    async save(location: Location): Promise<Location> {
        const raw = LocationMap.toPersistence(location);

        try {
            if (location.id) {
                const { rows } = await pgPool.query<LocationRow>(
                    `UPDATE locations SET name = $1, updated_at = now()
                     WHERE id = $2 RETURNING *`,
                    [raw.name, location.id]
                );
                if (!rows[0]) throw new Error("Location not found after update");
                return LocationMap.toDomain(rows[0]);
            }

            const { rows } = await pgPool.query<LocationRow>(
                `INSERT INTO locations (name) VALUES ($1) RETURNING *`,
                [raw.name]
            );
            return LocationMap.toDomain(rows[0]);
        } catch (err: any) {
            if (err?.code === "23505") {
                throw new Error("LOCATION_NAME_ALREADY_EXISTS");
            }
            throw err;
        }
    }

    async delete(id: string): Promise<void> {
        await pgPool.query("DELETE FROM locations WHERE id = $1", [id]);
    }
}
