import { ICategoryRepository } from "../../domain/ICategoryRepository";
import { Category } from "../../domain/Category";
import { CategoryMap } from "../../mappers/CategoryMap";
import { prisma } from "../../../../shared/infra/prisma/prismaClient";

export class PrismaCategoryRepository implements ICategoryRepository {
    async findById(id: string): Promise<Category | null> {
        const row = await prisma.category.findUnique({ where: { id } });
        return row ? CategoryMap.toDomain(row) : null;
    }

    async findAll(): Promise<Category[]> {
        const rows = await prisma.category.findMany({ orderBy: { name: "asc" } });
        return rows.map(CategoryMap.toDomain);
    }

    async save(category: Category): Promise<Category> {
        try {
            if (category.id) {
                const updated = await prisma.category.update({
                    where: { id: category.id },
                    data: { name: category.name },
                });
                return CategoryMap.toDomain(updated);
            }

            const created = await prisma.category.create({
                data: { name: category.name },
            });
            return CategoryMap.toDomain(created);
        } catch (err: any) {
            if (err?.code === "P2002") {
                throw new Error("CATEGORY_NAME_ALREADY_EXISTS");
            }
            throw err;
        }
    }

    async delete(id: string): Promise<void> {
        await prisma.category.delete({ where: { id } });
    }
}
