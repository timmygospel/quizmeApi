import { IHostRepository } from "../../domain/IHostRepository";
import { Host } from "../../domain/Host";
import { HostMap, HostRow } from "../../mappers/HostMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

export class PgHostRepository implements IHostRepository {
    async findById(id: string): Promise<Host | null> {
        const { rows } = await pgPool.query<HostRow>("SELECT * FROM hosts WHERE id = $1", [id]);
        return rows[0] ? HostMap.toDomain(rows[0]) : null;
    }

    async findAll(): Promise<Host[]> {
        const { rows } = await pgPool.query<HostRow>("SELECT * FROM hosts ORDER BY name ASC");
        return rows.map((r) => HostMap.toDomain(r));
    }

    async save(host: Host): Promise<Host> {
        const raw = HostMap.toPersistence(host);

        try {
            const { rows } = await pgPool.query<HostRow>(
                `INSERT INTO hosts (name) VALUES ($1) RETURNING *`,
                [raw.name]
            );
            return HostMap.toDomain(rows[0]);
        } catch (err: any) {
            if (err?.code === "23505") {
                throw new Error("HOST_NAME_ALREADY_EXISTS");
            }
            throw err;
        }
    }
}
