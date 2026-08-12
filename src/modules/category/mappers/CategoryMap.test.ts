import { CategoryMap } from "./CategoryMap";

describe("CategoryMap.toDomain", () => {
    it("maps a Postgres row into a Category domain object", () => {
        const category = CategoryMap.toDomain({
            id: "cat-1",
            name: "Health & Safety",
            created_at: new Date("2026-01-01T00:00:00Z"),
            updated_at: new Date("2026-01-01T00:00:00Z"),
        });

        expect(category.id).toBe("cat-1");
        expect(category.name).toBe("Health & Safety");
    });

    it("round-trips through toDTO", () => {
        const category = CategoryMap.toDomain({
            id: "cat-1",
            name: "Health & Safety",
            created_at: new Date(),
            updated_at: new Date(),
        });

        expect(CategoryMap.toDTO(category)).toEqual({ id: "cat-1", name: "Health & Safety" });
    });
});
