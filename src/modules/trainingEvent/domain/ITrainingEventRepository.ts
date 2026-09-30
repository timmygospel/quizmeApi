import {
    Attendee,
    CheckAttempt,
    CheckQuestion,
    CheckResponse,
    KnowledgeCheck,
    TrainingEvent,
} from "./TrainingEvent";

export interface NewCheckInput {
    quizSectionId: string;
    name: string;
    position: number;
}

export interface SnapshotQuestionInput {
    sourceQuestionId: string | null;
    question: string;
    options: { text: string; correct: boolean }[];
}

/** One row of the trainer's results grid. */
export interface AttendeeResultRow {
    attendeeId: string;
    displayName: string;
    isGuest: boolean;
    joinedAt: Date;
    /** checkId -> result for that check (absent = not started) */
    checks: Record<string, { submitted: boolean; scorePercentage: number | null }>;
}

export interface ITrainingEventRepository {
    create(event: Omit<TrainingEvent, "id" | "createdAt" | "endedAt" | "status">, checks: NewCheckInput[]): Promise<TrainingEvent>;
    joinCodeExists(joinCode: string): Promise<boolean>;
    findById(id: string): Promise<TrainingEvent | null>;
    findByJoinCode(joinCode: string): Promise<TrainingEvent | null>;
    /** ownerId undefined = every event (organisation-wide callers). */
    list(ownerId?: string): Promise<TrainingEvent[]>;
    endEvent(id: string, at: Date): Promise<void>;

    findChecks(eventId: string): Promise<KnowledgeCheck[]>;
    findCheck(checkId: string): Promise<KnowledgeCheck | null>;
    /** Opens this check (closing any other open check of the event). Snapshot is written only if the check has none yet. */
    openCheck(checkId: string, snapshot: SnapshotQuestionInput[], at: Date): Promise<void>;
    /** Closes the check and submits (scores) every unsubmitted attempt on it. */
    closeCheck(checkId: string, at: Date): Promise<void>;
    hasSnapshot(checkId: string): Promise<boolean>;
    findCheckQuestions(checkId: string): Promise<CheckQuestion[]>;
    /** eventId -> per-check counts for the trainer view */
    countSubmissions(eventId: string): Promise<Record<string, { started: number; submitted: number }>>;

    createAttendee(eventId: string, displayName: string, userId: string | null): Promise<Attendee>;
    findAttendee(id: string): Promise<Attendee | null>;
    /** The signed-in user's attendee record for this event, created on first join. */
    findOrCreateUserAttendee(eventId: string, userId: string, displayName: string): Promise<{ attendee: Attendee; created: boolean }>;
    /** Guests of the event who haven't been merged away, oldest first. */
    listGuests(eventId: string): Promise<Attendee[]>;
    countAttendees(eventId: string): Promise<number>;
    addToken(attendeeId: string, tokenHash: string): Promise<void>;
    /** Follows merges: returns the attendee the token now belongs to. */
    findAttendeeByTokenHash(tokenHash: string): Promise<Attendee | null>;
    touchAttendee(attendeeId: string, at: Date): Promise<void>;
    /** Moves `fromId`'s tokens and non-conflicting attempts to `intoId` and marks `fromId` merged. */
    mergeAttendees(fromId: string, intoId: string): Promise<void>;

    findAttempt(checkId: string, attendeeId: string): Promise<CheckAttempt | null>;
    findAttemptsForAttendee(attendeeId: string): Promise<CheckAttempt[]>;
    /** Creates the attempt if needed and upserts the answer. */
    saveResponse(checkId: string, attendeeId: string, response: CheckResponse): Promise<void>;
    findResponses(checkId: string, attendeeId: string): Promise<CheckResponse[]>;
    submitAttempt(checkId: string, attendeeId: string, scorePercentage: number, at: Date): Promise<CheckAttempt>;

    getResults(eventId: string): Promise<AttendeeResultRow[]>;
}
