import { Result } from "../../../../../shared/core/Result";
import { IHostRepository } from "../../../domain/IHostRepository";
import { Host } from "../../../domain/Host";

export class GetAllHostsUseCase {
    constructor(private repo: IHostRepository) { }

    async execute(): Promise<Result<Host[]>> {
        try {
            const hosts = await this.repo.findAll();
            return Result.ok(hosts);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
