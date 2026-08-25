import { Session } from "./Session";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";

export interface ISessionRepository {
    findById(id: string): Promise<Session | null>;
    findAll(scope?: EffectiveScope): Promise<Session[]>;
    save(session: Session): Promise<Session>;
}
