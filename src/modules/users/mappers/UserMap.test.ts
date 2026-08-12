import { UserMap, UserRow } from "./UserMap";

function baseRow(overrides: Partial<UserRow> = {}): UserRow {
    return {
        id: "user-1",
        first_name: "Sarah",
        last_name: "Johnson",
        email: "sarah@example.com",
        status: "ACTIVE",
        last_login_at: null,
        created_at: new Date("2026-01-01T00:00:00Z"),
        updated_at: new Date("2026-01-01T00:00:00Z"),
        department_id: null,
        department_name: null,
        location_id: null,
        location_name: null,
        roles: null,
        ...overrides,
    };
}

describe("UserMap.toDomain", () => {
    it("maps a Postgres row into a User domain object", () => {
        const user = UserMap.toDomain(baseRow());

        expect(user.id).toBe("user-1");
        expect(user.firstName).toBe("Sarah");
        expect(user.lastName).toBe("Johnson");
        expect(user.displayName).toBe("Sarah Johnson");
        expect(user.email).toBe("sarah@example.com");
        expect(user.status).toBe("ACTIVE");
        expect(user.department).toBeNull();
        expect(user.location).toBeNull();
        expect(user.roles).toEqual([]);
    });

    it("maps department/location/roles when present", () => {
        const user = UserMap.toDomain(
            baseRow({
                department_id: "dept-1",
                department_name: "Operations",
                location_id: "loc-1",
                location_name: "Birmingham",
                roles: [{ id: "role-1", name: "Manager" }],
            })
        );

        expect(user.department).toEqual({ id: "dept-1", name: "Operations" });
        expect(user.location).toEqual({ id: "loc-1", name: "Birmingham" });
        expect(user.roles).toEqual([{ id: "role-1", name: "Manager" }]);
    });

    it("throws when the row's email is invalid", () => {
        expect(() => UserMap.toDomain(baseRow({ email: "not-an-email" }))).toThrow();
    });
});

describe("UserMap.toDTO", () => {
    it("round-trips through toDTO", () => {
        const user = UserMap.toDomain(
            baseRow({
                department_id: "dept-1",
                department_name: "Operations",
                roles: [{ id: "role-1", name: "Manager" }],
            })
        );

        expect(UserMap.toDTO(user)).toEqual({
            id: "user-1",
            firstName: "Sarah",
            lastName: "Johnson",
            displayName: "Sarah Johnson",
            email: "sarah@example.com",
            status: "ACTIVE",
            roles: [{ id: "role-1", name: "Manager" }],
            department: { id: "dept-1", name: "Operations" },
            location: null,
            lastLoginAt: null,
            createdAt: "2026-01-01T00:00:00.000Z",
            updatedAt: "2026-01-01T00:00:00.000Z",
        });
    });
});
