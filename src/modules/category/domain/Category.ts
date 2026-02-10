import { CategoryName } from "./valueObjects/CategoryName";

export interface CategoryProps {
    name: CategoryName;
    createdAt?: Date;
    updatedAt?: Date;
}

export class Category {
    public readonly id?: string;
    public readonly props: CategoryProps;

    constructor(props: CategoryProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get name(): string {
        return this.props.name.value;
    }
}
