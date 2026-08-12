import { HostName } from "./valueObjects/HostName";

export interface HostProps {
    name: HostName;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Host {
    public readonly id?: string;
    public readonly props: HostProps;

    constructor(props: HostProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get name(): string {
        return this.props.name.value;
    }
}
