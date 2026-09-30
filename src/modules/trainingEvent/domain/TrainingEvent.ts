// Training Events (Knowledge Checks): an informal, trainer-led whole-day course. Attendees join once
// (by the event's reusable join code / QR) and answer a Knowledge Check whenever the trainer opens one.
// Each check is one section of the event's quiz, snapshotted when it first opens. Self-paced: the
// trainer opens/closes a check; each attendee answers at their own speed and submits.

export type TrainingEventStatus = "OPEN" | "ENDED";
export type CheckStatus = "PENDING" | "OPEN" | "CLOSED";

export interface TrainingEvent {
    id: string;
    name: string;
    quizId: string;
    ownerId: string;
    joinCode: string;
    eventDate: string | null; // YYYY-MM-DD
    status: TrainingEventStatus;
    createdAt: Date;
    endedAt: Date | null;
}

export interface KnowledgeCheck {
    id: string;
    trainingEventId: string;
    quizSectionId: string | null;
    name: string;
    position: number;
    status: CheckStatus;
    openedAt: Date | null;
    closedAt: Date | null;
}

export interface CheckOption {
    text: string;
    correct: boolean;
}

/** A question as copied into the check when it first opened. */
export interface CheckQuestion {
    id: string;
    checkId: string;
    position: number;
    question: string;
    options: CheckOption[];
}

export interface Attendee {
    id: string;
    trainingEventId: string;
    displayName: string;
    /** null = guest */
    userId: string | null;
    mergedIntoId: string | null;
    createdAt: Date;
}

export interface CheckAttempt {
    id: string;
    checkId: string;
    attendeeId: string;
    startedAt: Date;
    submittedAt: Date | null;
    scorePercentage: number | null;
}

export interface CheckResponse {
    checkQuestionId: string;
    optionIndex: number;
    isCorrect: boolean;
}

export const NAME_MAX_LENGTH = 60;

/** Trims and validates an attendee's display name; null when unusable. */
export function cleanDisplayName(raw: unknown): string | null {
    if (typeof raw !== "string") return null;
    const name = raw.trim().replace(/\s+/g, " ");
    if (name.length === 0 || name.length > NAME_MAX_LENGTH) return null;
    return name;
}

/** Percentage of the check's questions answered correctly (unanswered = wrong), 2 decimals. */
export function scoreCheck(questionCount: number, responses: CheckResponse[]): number {
    if (questionCount === 0) return 0;
    const correct = responses.filter((r) => r.isCorrect).length;
    return Math.round((correct / questionCount) * 10000) / 100;
}
