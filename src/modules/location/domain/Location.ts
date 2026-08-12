import { LocationName } from "./valueObjects/LocationName";

export interface LocationProps {
    name: LocationName;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Location {
    public readonly id?: string;
    public readonly props: LocationProps;

    constructor(props: LocationProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get name(): string {
        return this.props.name.value;
    }
}
