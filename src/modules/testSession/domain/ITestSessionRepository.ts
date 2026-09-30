import { TestSession, TestSessionStatus } from "./TestSession";
import { TestSessionParticipant, ParticipantStatus } from "./TestSessionParticipant";
import { AudienceRule } from "./AudienceRule";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";
import { ParticipantRowDTO } from "../dtos/TestSessionDTO";

export interface AudienceMatch {
    userId: string;
    locationId: string;
    locationName: string;
    departmentId: string;
    departmentName: string;
}

export interface AudiencePreviewGroup {
    locationId: string;
    locationName: string;
    departmentId: string;
    departmentName: string;
    count: number;
}

export interface AudiencePreviewResult {
    total: number;
    groups: AudiencePreviewGroup[];
}

export interface ParticipantAssignmentInput {
    userId: string;
    locationId: string | null;
    locationName: string | null;
    departmentId: string | null;
    departmentName: string | null;
    teamId: string | null;
    teamName: string | null;
}

export interface ResultsSummary {
    assigned: number;
    started: number;
    completed: number;
    passed: number;
    failed: number;
    timedOut: number;
    averageScore: number;
    completionRate: number;
    passRate: number;
}

/**
 * How one question went across the session: every participant's counted attempt (their best),
 * with unanswered counting as wrong — the same rules as the score.
 */
export interface QuestionAnalysisRow {
    questionId: string;
    /** 1-based position in the assessment */
    number: number;
    question: string;
    answered: number;
    correct: number;
    options: { id: string; text: string; isCorrect: boolean; picked: number }[];
}

export interface QuestionAnalysis {
    /** Participants with a finished (counted) attempt — the denominator for % correct. */
    completed: number;
    questions: QuestionAnalysisRow[];
}

export interface AnalyticsGroup {
    /** location/department/team id — used to drill down (e.g. a location's departments). */
    id: string | null;
    name: string;
    assigned: number;
    completed: number;
    averageScore: number;
    passRate: number;
}

export type AnalyticsGroupBy = "location" | "department" | "team";

export interface ActivityEntry {
    id: string;
    eventType: string;
    occurredAt: Date;
    actorName: string | null;
    /** For attempt events. */
    attemptNumber: number | null;
}

export interface MyTestSessionRow {
    session: TestSession;
    participant: TestSessionParticipant;
    /** Attempts started so far, finished or not. */
    attemptsUsed: number;
    /** What the participant needs to know before starting, and which result they can view. */
    details: {
        assessmentName: string;
        questionCount: number;
        passMark: number;
        trainerName: string | null;
        /** The attempt that counts (their best finished one); null until something is finished. */
        resultAttemptId: string | null;
    };
}

export interface ITestSessionRepository {
    findById(id: string): Promise<TestSession | null>;
    findAll(scope?: EffectiveScope): Promise<TestSession[]>;
    create(session: TestSession, participants: ParticipantAssignmentInput[]): Promise<TestSession>;
    updateStatus(
        id: string,
        status: TestSessionStatus,
        timestamps?: { startedAt?: Date; closedAt?: Date }
    ): Promise<TestSession>;

    resolveActiveUsers(rules: AudienceRule[]): Promise<AudienceMatch[]>;
    previewAudience(rules: AudienceRule[]): Promise<AudiencePreviewResult>;

    findParticipantForUser(testSessionId: string, userId: string): Promise<TestSessionParticipant | null>;
    findParticipantById(id: string): Promise<TestSessionParticipant | null>;
    updateParticipantStatus(
        id: string,
        status: ParticipantStatus,
        timestamps?: { startedAt?: Date; completedAt?: Date }
    ): Promise<void>;
    findMyTestSessions(userId: string): Promise<MyTestSessionRow[]>;
    /**
     * Participants in these sessions who never started and can no longer start — the availability
     * window has passed, or the session was closed/completed — become EXPIRED. Cancelled sessions
     * are left alone.
     */
    expireUnstartedParticipants(testSessionIds: string[], now: Date): Promise<void>;

    getResults(testSessionId: string): Promise<ResultsSummary>;
    getQuestionAnalysis(testSessionId: string, assessmentId: string): Promise<QuestionAnalysis>;
    /** `locationId` limits the breakdown to one location (drill-down: that location's departments). */
    getAnalyticsBreakdown(testSessionId: string, groupBy: AnalyticsGroupBy, locationId?: string): Promise<AnalyticsGroup[]>;
    /** Audit trail for the session and its attempts, newest first. */
    getActivity(testSessionId: string): Promise<ActivityEntry[]>;
    getParticipants(testSessionId: string): Promise<ParticipantRowDTO[]>;
}
