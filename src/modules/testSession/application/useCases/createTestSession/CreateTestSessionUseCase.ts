import { Result } from "../../../../../shared/core/Result";
import { EffectiveScope } from "../../../../../shared/core/EffectiveScope";
import { ITestSessionRepository, ParticipantAssignmentInput } from "../../../domain/ITestSessionRepository";
import { TestSession, TestSessionStatus } from "../../../domain/TestSession";
import { AudienceRule } from "../../../domain/AudienceRule";
import { isAudienceWithinScope } from "../../../domain/audienceScope";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { CreateTestSessionDTO } from "./CreateTestSessionDTO";
import { recordAuditEvent } from "../../../../../shared/infra/audit/recordAuditEvent";

export class CreateTestSessionUseCase {
    constructor(
        private testSessionRepo: ITestSessionRepository,
        private assessmentRepo: IAssessmentRepository
    ) { }

    async execute(dto: CreateTestSessionDTO, ownerId: string, scope?: EffectiveScope): Promise<Result<TestSession>> {
        try {
            if (!dto.name || dto.name.trim().length === 0) {
                return Result.fail("A session name is required");
            }

            const audience: AudienceRule[] = dto.audience ?? [];
            if (audience.length === 0) {
                return Result.fail("Select at least one audience rule (location + department)");
            }
            for (const rule of audience) {
                if (!rule.locationId || !rule.departmentId) {
                    return Result.fail("Each audience rule requires a location and a department");
                }
            }

            // Trainer scope enforcement (PERMISSIONS.md §11) — server-side,
            // never just hidden in the frontend.
            if (!isAudienceWithinScope(audience, scope)) {
                return Result.fail("FORBIDDEN: one or more audience rules are outside your permitted scope");
            }

            if (!dto.assessmentId) return Result.fail("An assessment is required");
            const assessment = await this.assessmentRepo.findById(dto.assessmentId);
            if (!assessment) return Result.fail(`Assessment with id ${dto.assessmentId} not found`);
            // "assessment_version_id" == a published assessments.id — see
            // UpdateAssessmentUseCase's ASSESSMENT_PUBLISHED_IMMUTABLE rule.
            if (assessment.status !== "PUBLISHED") {
                return Result.fail("Only a published assessment can be delivered by a Test Session");
            }

            if (!dto.availableFrom || !dto.availableUntil) {
                return Result.fail("availableFrom and availableUntil are required");
            }
            const availableFrom = new Date(dto.availableFrom);
            const availableUntil = new Date(dto.availableUntil);
            if (isNaN(availableFrom.getTime()) || isNaN(availableUntil.getTime())) {
                return Result.fail("availableFrom/availableUntil must be valid dates");
            }
            if (availableUntil <= availableFrom) {
                return Result.fail("availableUntil must be after availableFrom");
            }

            const timeLimitMinutes = dto.timeLimitMinutes;
            if (!timeLimitMinutes || timeLimitMinutes <= 0) {
                return Result.fail("timeLimitMinutes must be greater than 0");
            }
            const maxAttempts = dto.maxAttempts ?? 1;
            if (maxAttempts <= 0) return Result.fail("maxAttempts must be greater than 0");

            const now = new Date();
            const status: TestSessionStatus = now < availableFrom ? "SCHEDULED" : now > availableUntil ? "CLOSED" : "OPEN";

            // Resolve audience -> explicit participants at creation time
            // (never recomputed dynamically at reporting time).
            const matches = await this.testSessionRepo.resolveActiveUsers(audience);
            const teamByPair = new Map(audience.map((r) => [`${r.locationId}:${r.departmentId}`, r.teamId ?? null]));
            const participants: ParticipantAssignmentInput[] = matches.map((m) => ({
                userId: m.userId,
                locationId: m.locationId,
                locationName: m.locationName,
                departmentId: m.departmentId,
                departmentName: m.departmentName,
                teamId: teamByPair.get(`${m.locationId}:${m.departmentId}`) ?? null,
                teamName: null,
            }));

            const session = new TestSession({
                assessmentId: dto.assessmentId,
                name: dto.name.trim(),
                ownerId,
                availableFrom,
                availableUntil,
                timeLimitMinutes,
                maxAttempts,
                status,
                audience,
            });

            const saved = await this.testSessionRepo.create(session, participants);

            await recordAuditEvent({
                actorUserId: ownerId,
                eventType: "TEST_SESSION_CREATED",
                entityType: "test_session",
                entityId: saved.id!,
                metadata: { assessmentId: dto.assessmentId, participantCount: participants.length },
            });

            return Result.ok(saved);
        } catch (err) {
            return Result.fail(err instanceof Error ? err.message : String(err));
        }
    }
}
