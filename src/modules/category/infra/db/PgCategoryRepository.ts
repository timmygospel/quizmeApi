import { ICategoryRepository } from "../../domain/ICategoryRepository";
import { Category } from "../../domain/Category";
import { CategoryMap, CategoryRow } from "../../mappers/CategoryMap";
import { pgPool } from "../../../../shared/infra/postgres/pgClient";

export class PgCategoryRepository implements ICategoryRepository {
    async findById(id: string): Promise<Category | null> {
        const { rows } = await pgPool.query<CategoryRow>("SELECT * FROM categories WHERE id = $1", [id]);
        return rows[0] ? CategoryMap.toDomain(rows[0]) : null;
    }

    async findAll(): Promise<Category[]> {
        const { rows } = await pgPool.query<CategoryRow>("SELECT * FROM categories ORDER BY created_at DESC");
        return rows.map((r) => CategoryMap.toDomain(r));
    }

    async save(category: Category): Promise<Category> {
        try {
            if (category.id) {
                const { rows } = await pgPool.query<CategoryRow>(
                    `UPDATE categories SET name = $1, updated_at = now() WHERE id = $2 RETURNING *`,
                    [category.name, category.id]
                );
                if (!rows[0]) throw new Error("Category not found after update");
                return CategoryMap.toDomain(rows[0]);
            }

            const { rows } = await pgPool.query<CategoryRow>(
                `INSERT INTO categories (name) VALUES ($1) RETURNING *`,
                [category.name]
            );
            return CategoryMap.toDomain(rows[0]);
        } catch (err: any) {
            if (err?.code === "23505") {
                throw new Error("CATEGORY_NAME_ALREADY_EXISTS");
            }
            throw err;
        }
    }

    async delete(id: string): Promise<void> {
        await pgPool.query("DELETE FROM categories WHERE id = $1", [id]);
    }
}
