/**
 * Guard - a simple validation helper for domain invariants.
 */
export interface IGuardArgument {
    argument: any;
    argumentName: string;
}

export class Guard {
    public static againstNullOrUndefined(argument: any, argumentName: string) {
        if (argument === null || argument === undefined) {
            throw new Error(`${argumentName} is null or undefined`);
        }
    }

    public static againstEmptyString(argument: string, argumentName: string) {
        if (!argument || argument.trim().length === 0) {
            throw new Error(`${argumentName} is an empty string`);
        }
    }

    public static againstEmptyArray(argument: any[], argumentName: string) {
        if (!argument || argument.length === 0) {
            throw new Error(`${argumentName} is an empty array`);
        }
    }
}
