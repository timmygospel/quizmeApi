import { Department } from "./Department";

export interface IDepartmentRepository {
    findById(id: string): Promise<Department | null>;
    findAll(): Promise<Department[]>;
    save(department: Department): Promise<Department>;
    /** True while anything (users, role scopes, sessions, participants) still references it. */
    isInUse(id: string): Promise<boolean>;
    delete(id: string): Promise<void>;
}
