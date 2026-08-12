import { SessionName } from "./valueObjects/SessionName";

export type SessionType = "assessment" | "live-quiz";

export interface SessionProps {
    templateId: string;
    name: SessionName;
    departmentIds: string[];
    locationIds: string[];
    allLocations: boolean;
    sectionIds: string[];
    host: string;
    sessionType: SessionType;
    passThreshold: number;
    allowMultipleAttempts: boolean;
    additionalNotes: string;
    createdAt?: Date;
    updatedAt?: Date;
}

/**
 * A Session is the operational delivery of a reusable Training Template —
 * it never edits the template's content, only references which sections
 * are included and who receives it. See SESSION.md for the full model.
 */
export class Session {
    public readonly id?: string;
    public readonly props: SessionProps;

    constructor(props: SessionProps, id?: string) {
        this.props = props;
        this.id = id;
    }

    get templateId(): string {
        return this.props.templateId;
    }

    get name(): string {
        return this.props.name.value;
    }

    get departmentIds(): string[] {
        return this.props.departmentIds;
    }

    get locationIds(): string[] {
        return this.props.locationIds;
    }

    get allLocations(): boolean {
        return this.props.allLocations;
    }

    get sectionIds(): string[] {
        return this.props.sectionIds;
    }

    get host(): string {
        return this.props.host;
    }

    get sessionType(): SessionType {
        return this.props.sessionType;
    }

    get passThreshold(): number {
        return this.props.passThreshold;
    }

    get allowMultipleAttempts(): boolean {
        return this.props.allowMultipleAttempts;
    }

    get additionalNotes(): string {
        return this.props.additionalNotes;
    }

    get createdAt(): Date | undefined {
        return this.props.createdAt;
    }

    get updatedAt(): Date | undefined {
        return this.props.updatedAt;
    }
}
