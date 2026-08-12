import { Location } from "./Location";

export interface ILocationRepository {
    findById(id: string): Promise<Location | null>;
    findAll(): Promise<Location[]>;
    save(location: Location): Promise<Location>;
    delete(id: string): Promise<void>;
}
