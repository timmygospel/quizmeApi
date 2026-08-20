import { RoleMap, RoleRow } from "./RoleMap";

function baseRow(overrides: Partial<RoleRow> = {}): RoleRow {
    return {
        id: "role-1",
        code: "MANAGER",
        name: "Manager",
        description: "Monitors assigned teams and manages their training.",
        type: "SYSTEM",
        user_count: "84",
        permission_codes: null,
        archived_at: null,
        created_at: new Date("2026-01-01T00:00:00Z"),
        updated_at: new Date("2026-01-01T00:00:00Z"),
        ...overrides,
    };
}

describe("RoleMap.toDomain", () => {
    it("maps a Postgres row into a Role domain object, parsing user_count to a number", () => {
        const role = RoleMap.toDomain(baseRow());

        expect(role.id).toBe("role-1");
        expect(role.code).toBe("MANAGER");
        expect(role.name).toBe("Manager");
        expect(role.type).toBe("SYSTEM");
        expect(role.userCount).toBe(84);
    });

    it("handles a zero user count", () => {
        const role = RoleMap.toDomain(baseRow({ user_count: "0" }));
        expect(role.userCount).toBe(0);
    });
});

describe("RoleMap.toDTO", () => {
    it("round-trips through toDTO", () => {
        const role = RoleMap.toDomain(baseRow());

        expect(RoleMap.toDTO(role)).toEqual({
            id: "role-1",
            code: "MANAGER",
            name: "Manager",
            description: "Monitors assigned teams and manages their training.",
            type: "SYSTEM",
            userCount: 84,
            permissions: [],
            archivedAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        });
    });
});
