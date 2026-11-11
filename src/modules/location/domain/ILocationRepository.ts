import { Location } from "./Location";

export interface ILocationRepository {
    findById(id: string): Promise<Location | null>;
    findAll(): Promise<Location[]>;
    save(location: Location): Promise<Location>;
    /** True while anything (users, role scopes, sessions, participants) still references it. */
    isInUse(id: string): Promise<boolean>;
    delete(id: string): Promise<void>;
}
