import { Host } from "./Host";

export interface IHostRepository {
    findById(id: string): Promise<Host | null>;
    findAll(): Promise<Host[]>;
    save(host: Host): Promise<Host>;
}
