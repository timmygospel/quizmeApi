import { difficultyFor } from "./PgLiveEventAnalyticsRepository";

describe("difficultyFor", () => {
    it("bands a high correct rate as Easy", () => {
        expect(difficultyFor(70)).toBe("Easy");
        expect(difficultyFor(95)).toBe("Easy");
    });

    it("bands a mid correct rate as Medium", () => {
        expect(difficultyFor(40)).toBe("Medium");
        expect(difficultyFor(69)).toBe("Medium");
    });

    it("bands a low correct rate as Hard", () => {
        expect(difficultyFor(0)).toBe("Hard");
        expect(difficultyFor(39)).toBe("Hard");
    });
});
