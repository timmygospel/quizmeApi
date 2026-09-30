import { CheckStatus, KnowledgeCheck, TrainingEvent, TrainingEventStatus } from "../domain/TrainingEvent";

export interface TrainingEventDTO {
    id: string;
    name: string;
    quizId: string;
    ownerId: string;
    joinCode: string;
    eventDate: string | null;
    status: TrainingEventStatus;
    createdAt: string;
    endedAt: string | null;
}

export interface KnowledgeCheckDTO {
    id: string;
    name: string;
    position: number;
    status: CheckStatus;
    openedAt: string | null;
    closedAt: string | null;
    started: number;
    submitted: number;
}

export interface TrainingEventDetailDTO extends TrainingEventDTO {
    attendeeCount: number;
    checks: KnowledgeCheckDTO[];
}

export interface TrainingEventResultsDTO {
    checks: { id: string; name: string; position: number; status: CheckStatus }[];
    attendees: {
        attendeeId: string;
        displayName: string;
        isGuest: boolean;
        joinedAt: string;
        checks: Record<string, { submitted: boolean; scorePercentage: number | null }>;
    }[];
}

// ── Attendee-facing ──────────────────────────────────────────────────────────

export interface AttendeeDTO {
    id: string;
    displayName: string;
    isGuest: boolean;
}

export interface PublicEventDTO {
    name: string;
    eventDate: string | null;
    status: TrainingEventStatus;
    /** The attendee this browser's token belongs to, if any. */
    attendee: AttendeeDTO | null;
    /** Set when the request is from a signed-in user: they can join as themselves, no name needed. */
    signedInAs: string | null;
}

export interface JoinResultDTO {
    /** Keep this (e.g. localStorage) and send it as X-Attendee-Token. Shown once; only its hash is stored. */
    token: string;
    attendee: AttendeeDTO;
}

export type MyCheckStatus = "NOT_STARTED" | "IN_PROGRESS" | "SUBMITTED";

export interface CheckQuestionForAttendeeDTO {
    id: string;
    question: string;
    options: string[];
}

export interface ReviewItemDTO {
    questionId: string;
    question: string;
    options: { text: string; correct: boolean }[];
    selectedIndex: number | null;
    isCorrect: boolean;
}

export interface CheckResultDTO {
    scorePercentage: number;
    review: ReviewItemDTO[];
}

export interface CurrentActivityDTO {
    event: { name: string; eventDate: string | null; status: TrainingEventStatus };
    attendee: AttendeeDTO;
    checks: { id: string; name: string; position: number; status: CheckStatus; myStatus: MyCheckStatus; scorePercentage: number | null }[];
    /** The check the trainer has open right now, if any. */
    openCheck: null | {
        id: string;
        name: string;
        questions: CheckQuestionForAttendeeDTO[];
        /** questionId -> chosen option index */
        answers: Record<string, number>;
        submitted: boolean;
        /** Present once submitted: score and the correct answers. */
        result: CheckResultDTO | null;
    };
}

export function toEventDTO(e: TrainingEvent): TrainingEventDTO {
    return {
        id: e.id, name: e.name, quizId: e.quizId, ownerId: e.ownerId, joinCode: e.joinCode, eventDate: e.eventDate,
        status: e.status, createdAt: e.createdAt.toISOString(), endedAt: e.endedAt ? e.endedAt.toISOString() : null,
    };
}

export function toCheckDTO(c: KnowledgeCheck, counts: { started: number; submitted: number } | undefined): KnowledgeCheckDTO {
    return {
        id: c.id, name: c.name, position: c.position, status: c.status,
        openedAt: c.openedAt ? c.openedAt.toISOString() : null, closedAt: c.closedAt ? c.closedAt.toISOString() : null,
        started: counts?.started ?? 0, submitted: counts?.submitted ?? 0,
    };
}
