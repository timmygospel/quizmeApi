import { IDepartmentRepository } from "../../domain/IDepartmentRepository";
import { Department } from "../../domain/Department";
import { DepartmentMap, DepartmentRow } from "../../mappers/DepartmentMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

export class PgDepartmentRepository implements IDepartmentRepository {
    async findById(id: string): Promise<Department | null> {
        const { rows } = await pgPool.query<DepartmentRow>(
            "SELECT * FROM departments WHERE id = $1",
            [id]
        );
        return rows[0] ? DepartmentMap.toDomain(rows[0]) : null;
    }

    async findAll(): Promise<Department[]> {
        const { rows } = await pgPool.query<DepartmentRow>(
            "SELECT * FROM departments ORDER BY name ASC"
        );
        return rows.map((r) => DepartmentMap.toDomain(r));
    }

    async save(department: Department): Promise<Department> {
        const raw = DepartmentMap.toPersistence(department);

        try {
            if (department.id) {
                const { rows } = await pgPool.query<DepartmentRow>(
                    `UPDATE departments SET name = $1, updated_at = now()
                     WHERE id = $2 RETURNING *`,
                    [raw.name, department.id]
                );
                if (!rows[0]) throw new Error("Department not found after update");
                return DepartmentMap.toDomain(rows[0]);
            }

            const { rows } = await pgPool.query<DepartmentRow>(
                `INSERT INTO departments (name) VALUES ($1) RETURNING *`,
                [raw.name]
            );
            return DepartmentMap.toDomain(rows[0]);
        } catch (err: any) {
            if (err?.code === "23505") {
                // unique_violation
                throw new Error("DEPARTMENT_NAME_ALREADY_EXISTS");
            }
            throw err;
        }
    }

    async delete(id: string): Promise<void> {
        await pgPool.query("DELETE FROM departments WHERE id = $1", [id]);
    }
}
