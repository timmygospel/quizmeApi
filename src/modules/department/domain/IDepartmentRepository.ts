import { Department } from "./Department";

export interface IDepartmentRepository {
    findById(id: string): Promise<Department | null>;
    findAll(): Promise<Department[]>;
    save(department: Department): Promise<Department>;
    delete(id: string): Promise<void>;
}
