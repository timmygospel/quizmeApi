import { ICategoryRepository } from "../../domain/ICategoryRepository";
import { Category } from "../../domain/Category";
import { CategoryModel, ICategoryDocument } from "./CategoryModel";
import { CategoryMap } from "../../mappers/CategoryMap";

export class MongoCategoryRepository implements ICategoryRepository {
    async findById(id: string): Promise<Category | null> {
        const doc = await CategoryModel.findById(id).exec();
        return doc ? CategoryMap.toDomain(doc as ICategoryDocument) : null;
    }

    async findAll(): Promise<Category[]> {
        const docs = await CategoryModel.find().exec();
        return docs.map((d) => CategoryMap.toDomain(d as ICategoryDocument));
    }

    async save(category: Category): Promise<Category> {
        const raw = CategoryMap.toPersistence(category);

        try {
            if (category.id) {
                const updated = await CategoryModel.findByIdAndUpdate(category.id, raw, {
                    new: true,
                    runValidators: true,
                }).exec();

                if (!updated) throw new Error("Category not found after update");
                return CategoryMap.toDomain(updated);
            }

            const created = await CategoryModel.create(raw);
            return CategoryMap.toDomain(created);
        } catch (err: any) {
            // ✅ Mongo duplicate key error
            if (err?.code === 11000) {
                throw new Error("CATEGORY_NAME_ALREADY_EXISTS");
            }
            throw err;
        }
    }

    async delete(id: string): Promise<void> {
        await CategoryModel.findByIdAndDelete(id).exec();
    }
}
