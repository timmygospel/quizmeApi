import { TestSession, TestSessionStatus } from "./TestSession";
import { TestSessionParticipant, ParticipantStatus } from "./TestSessionParticipant";
import { AudienceRule } from "./AudienceRule";
import { EffectiveScope } from "../../../shared/core/EffectiveScope";

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

export interface AnalyticsGroup {
    name: string;
    assigned: number;
    completed: number;
    averageScore: number;
    passRate: number;
}

export type AnalyticsGroupBy = "location" | "department" | "team";

export interface MyTestSessionRow {
    session: TestSession;
    participant: TestSessionParticipant;
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

    getResults(testSessionId: string): Promise<ResultsSummary>;
    getAnalyticsBreakdown(testSessionId: string, groupBy: AnalyticsGroupBy): Promise<AnalyticsGroup[]>;
}
