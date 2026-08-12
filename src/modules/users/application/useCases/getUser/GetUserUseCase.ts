import { Result } from "../../../../../shared/core/Result";
import { IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";

export class GetUserUseCase {
    constructor(private repo: IUserRepository) { }

    async execute(id: string): Promise<Result<User>> {
        try {
            const user = await this.repo.findById(id);
            if (!user) {
                return Result.fail(`User with id ${id} not found`);
            }
            return Result.ok(user);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
