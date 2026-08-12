import { DepartmentName } from "./valueObjects/DepartmentName";

export interface DepartmentProps {
    name: DepartmentName;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Department {
    public readonly id?: string;
    public readonly props: DepartmentProps;

    constructor(props: DepartmentProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get name(): string {
        return this.props.name.value;
    }
}
