export type RoleType = "SYSTEM" | "CUSTOM";

export interface RoleProps {
    code: string;
    name: string;
    description: string;
    type: RoleType;
    userCount: number;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Role {
    public readonly id?: string;
    public readonly props: RoleProps;

    constructor(props: RoleProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get code(): string {
        return this.props.code;
    }

    get name(): string {
        return this.props.name;
    }

    get description(): string {
        return this.props.description;
    }

    get type(): RoleType {
        return this.props.type;
    }

    get userCount(): number {
        return this.props.userCount;
    }

    get createdAt(): Date | undefined {
        return this.props.createdAt;
    }

    get updatedAt(): Date | undefined {
        return this.props.updatedAt;
    }
}
