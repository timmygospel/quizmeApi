import { Role } from "./Role";

export interface IRoleRepository {
    findById(id: string): Promise<Role | null>;
    findAll(): Promise<Role[]>;
}
