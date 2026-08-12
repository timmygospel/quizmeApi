import { Session } from "./Session";

export interface ISessionRepository {
    findById(id: string): Promise<Session | null>;
    findAll(): Promise<Session[]>;
    save(session: Session): Promise<Session>;
}
