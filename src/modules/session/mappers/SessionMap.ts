import { Session, SessionType } from "../domain/Session";
import { SessionName } from "../domain/valueObjects/SessionName";
import { SessionDTO } from "../dtos/SessionDTO";

export interface SessionRow {
    id: string;
    template_id: string;
    name: string;
    department_ids: string[];
    location_ids: string[];
    all_locations: boolean;
    section_ids: string[];
    host: string;
    session_type: SessionType;
    pass_threshold: number;
    allow_multiple_attempts: boolean;
    additional_notes: string;
    created_at: Date;
    updated_at: Date;
}

export class SessionMap {
    public static toDTO(session: Session): SessionDTO {
        return {
            id: session.id!,
            templateId: session.templateId,
            name: session.name,
            departmentIds: session.departmentIds,
            locationIds: session.locationIds,
            allLocations: session.allLocations,
            sectionIds: session.sectionIds,
            host: session.host,
            sessionType: session.sessionType,
            passThreshold: session.passThreshold,
            allowMultipleAttempts: session.allowMultipleAttempts,
            additionalNotes: session.additionalNotes,
            createdAt: session.createdAt?.toISOString(),
            updatedAt: session.updatedAt?.toISOString(),
        };
    }

    public static toDomain(row: SessionRow): Session {
        const nameOrError = SessionName.create(row.name);
        if (nameOrError.isFailure) {
            throw new Error(nameOrError.errorValue());
        }

        return new Session(
            {
                templateId: row.template_id,
                name: nameOrError.getValue(),
                departmentIds: row.department_ids ?? [],
                locationIds: row.location_ids ?? [],
                allLocations: row.all_locations,
                sectionIds: row.section_ids ?? [],
                host: row.host,
                sessionType: row.session_type,
                passThreshold: row.pass_threshold,
                allowMultipleAttempts: row.allow_multiple_attempts,
                additionalNotes: row.additional_notes ?? "",
                createdAt: row.created_at,
                updatedAt: row.updated_at,
            },
            row.id
        );
    }

    public static toPersistence(session: Session) {
        return {
            template_id: session.templateId,
            name: session.name,
            department_ids: session.departmentIds,
            location_ids: session.locationIds,
            all_locations: session.allLocations,
            section_ids: session.sectionIds,
            host: session.host,
            session_type: session.sessionType,
            pass_threshold: session.passThreshold,
            allow_multiple_attempts: session.allowMultipleAttempts,
            additional_notes: session.additionalNotes,
        };
    }
}
