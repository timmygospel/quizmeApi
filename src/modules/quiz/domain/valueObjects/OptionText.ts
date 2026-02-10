import { Result } from "../../../../shared/core/Result";

export class OptionText {
    private constructor(public readonly value: string) { }

    public static create(value: string): Result<OptionText> {
        if (!value || value.trim().length === 0) {
            return Result.fail<OptionText>("Option text cannot be empty.");
        }

        return Result.ok<OptionText>(new OptionText(value.trim()));
    }
}

