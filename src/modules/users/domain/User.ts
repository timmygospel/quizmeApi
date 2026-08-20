import { UserEmail } from "./valueObjects/UserEmail";

export type UserStatus = "INVITED" | "ACTIVE" | "SUSPENDED" | "ARCHIVED";

export interface UserRoleRef {
    id: string;
    name: string;
}

export interface OrgRef {
    id: string;
    name: string;
}

export interface UserProps {
    firstName: string;
    lastName: string;
    email: UserEmail;
    status: UserStatus;
    department: OrgRef | null;
    location: OrgRef | null;
    roles: UserRoleRef[];
    lastLoginAt: Date | null;
    invitationSentAt: Date | null;
    createdAt?: Date;
    updatedAt?: Date;
}

export class User {
    public readonly id?: string;
    public readonly props: UserProps;

    constructor(props: UserProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get firstName(): string {
        return this.props.firstName;
    }

    get lastName(): string {
        return this.props.lastName;
    }

    get displayName(): string {
        return `${this.props.firstName} ${this.props.lastName}`;
    }

    get email(): string {
        return this.props.email.value;
    }

    get status(): UserStatus {
        return this.props.status;
    }

    get department(): OrgRef | null {
        return this.props.department;
    }

    get location(): OrgRef | null {
        return this.props.location;
    }

    get roles(): UserRoleRef[] {
        return this.props.roles;
    }

    get lastLoginAt(): Date | null {
        return this.props.lastLoginAt;
    }

    get invitationSentAt(): Date | null {
        return this.props.invitationSentAt;
    }

    get createdAt(): Date | undefined {
        return this.props.createdAt;
    }

    get updatedAt(): Date | undefined {
        return this.props.updatedAt;
    }
}
