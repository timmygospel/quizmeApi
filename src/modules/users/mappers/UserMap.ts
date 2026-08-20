import { User, UserStatus } from "../domain/User";
import { UserEmail } from "../domain/valueObjects/UserEmail";
import { UserDTO } from "../dtos/UserDTO";

export interface UserRow {
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    status: string;
    last_login_at: Date | null;
    invitation_sent_at: Date | null;
    created_at: Date;
    updated_at: Date;
    department_id: string | null;
    department_name: string | null;
    location_id: string | null;
    location_name: string | null;
    roles: { id: string; name: string }[] | null;
}

export class UserMap {
    public static toDTO(user: User): UserDTO {
        return {
            id: user.id,
            firstName: user.firstName,
            lastName: user.lastName,
            displayName: user.displayName,
            email: user.email,
            status: user.status,
            roles: user.roles,
            department: user.department,
            location: user.location,
            lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
            invitationSentAt: user.invitationSentAt ? user.invitationSentAt.toISOString() : null,
            createdAt: user.createdAt?.toISOString(),
            updatedAt: user.updatedAt?.toISOString(),
        };
    }

    public static toDomain(row: UserRow): User {
        const emailOrError = UserEmail.create(row.email);
        if (emailOrError.isFailure) {
            throw new Error(emailOrError.errorValue());
        }

        return new User(
            {
                firstName: row.first_name,
                lastName: row.last_name,
                email: emailOrError.getValue(),
                status: row.status as UserStatus,
                department: row.department_id
                    ? { id: row.department_id, name: row.department_name as string }
                    : null,
                location: row.location_id
                    ? { id: row.location_id, name: row.location_name as string }
                    : null,
                roles: row.roles ?? [],
                lastLoginAt: row.last_login_at,
                invitationSentAt: row.invitation_sent_at,
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            },
            row.id
        );
    }
}
