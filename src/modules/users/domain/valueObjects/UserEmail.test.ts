import { UserEmail } from "./UserEmail";

describe("UserEmail", () => {
    it("accepts a valid email and lower-cases/trims it", () => {
        const result = UserEmail.create("  Sarah@Example.com  ");
        expect(result.isSuccess).toBe(true);
        expect(result.getValue().value).toBe("sarah@example.com");
    });

    it("rejects an empty email", () => {
        const result = UserEmail.create("   ");
        expect(result.isFailure).toBe(true);
    });

    it("rejects an email without an @", () => {
        const result = UserEmail.create("not-an-email");
        expect(result.isFailure).toBe(true);
    });

    it("rejects an email without a domain", () => {
        const result = UserEmail.create("sarah@example");
        expect(result.isFailure).toBe(true);
    });
});
