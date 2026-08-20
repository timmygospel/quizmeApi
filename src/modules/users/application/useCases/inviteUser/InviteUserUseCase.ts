import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";
import { Guard } from "../../../../../shared/core/Guard";
import { IUserRepository } from "../../../domain/IUserRepository";
import { User } from "../../../domain/User";
import { UserEmail } from "../../../domain/valueObjects/UserEmail";
import { IRoleRepository } from "../../../../roles/domain/IRoleRepository";
import { IDepartmentRepository } from "../../../../department/domain/IDepartmentRepository";
import { ILocationRepository } from "../../../../location/domain/ILocationRepository";
import { InviteUserDTO } from "./InviteUserDTO";

export class InviteUserUseCase implements UseCase<InviteUserDTO, Promise<Result<User>>> {
    constructor(
        private userRepo: IUserRepository,
        private roleRepo: IRoleRepository,
        private departmentRepo: IDepartmentRepository,
        private locationRepo: ILocationRepository
    ) { }

    async execute(dto: InviteUserDTO): Promise<Result<User>> {
        try {
            Guard.againstEmptyString(dto.firstName, "firstName");
            Guard.againstEmptyString(dto.lastName, "lastName");
            Guard.againstEmptyArray(dto.roleIds, "roleIds");

            const emailOrError = UserEmail.create(dto.email);
            if (emailOrError.isFailure) return Result.fail(emailOrError.errorValue());

            const existing = await this.userRepo.findByEmail(emailOrError.getValue().value);
            if (existing) return Result.fail(`USER_EMAIL_ALREADY_EXISTS:${existing.id}`);

            for (const roleId of dto.roleIds) {
                const role = await this.roleRepo.findById(roleId);
                if (!role) return Result.fail(`ROLE_NOT_FOUND:${roleId}`);
            }

            if (dto.departmentId) {
                const department = await this.departmentRepo.findById(dto.departmentId);
                if (!department) return Result.fail(`DEPARTMENT_NOT_FOUND:${dto.departmentId}`);
            }

            if (dto.locationId) {
                const location = await this.locationRepo.findById(dto.locationId);
                if (!location) return Result.fail(`LOCATION_NOT_FOUND:${dto.locationId}`);
            }

            const user = await this.userRepo.create({
                email: emailOrError.getValue().value,
                firstName: dto.firstName.trim(),
                lastName: dto.lastName.trim(),
                departmentId: dto.departmentId ?? null,
                locationId: dto.locationId ?? null,
                roleIds: dto.roleIds,
            });

            return Result.ok(user);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
