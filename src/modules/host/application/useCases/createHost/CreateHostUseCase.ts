import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";
import { IHostRepository } from "../../../domain/IHostRepository";
import { Host } from "../../../domain/Host";
import { HostName } from "../../../domain/valueObjects/HostName";
import { CreateHostDTO } from "./CreateHostDTO";

export class CreateHostUseCase implements UseCase<CreateHostDTO, Promise<Result<Host>>> {
    constructor(private repo: IHostRepository) { }

    async execute(dto: CreateHostDTO): Promise<Result<Host>> {
        try {
            const nameOrError = HostName.create(dto.name);
            if (nameOrError.isFailure) return Result.fail(nameOrError.errorValue());

            const host = new Host({ name: nameOrError.getValue() });

            const saved = await this.repo.save(host);
            return Result.ok(saved);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
