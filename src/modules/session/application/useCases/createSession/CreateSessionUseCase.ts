import { Result } from "../../../../../shared/core/Result";
import { UseCase } from "../../../../../shared/core/UseCase";
import { ISessionRepository } from "../../../domain/ISessionRepository";
import { Session, SessionType } from "../../../domain/Session";
import { SessionName } from "../../../domain/valueObjects/SessionName";
import { CreateSessionDTO } from "./CreateSessionDTO";
import { IQuizRepository } from "../../../../quiz/domain/IQuizRepository";

const VALID_SESSION_TYPES: SessionType[] = ["assessment", "live-quiz"];

export class CreateSessionUseCase implements UseCase<CreateSessionDTO, Promise<Result<Session>>> {
    constructor(
        private sessionRepo: ISessionRepository,
        private quizRepo: IQuizRepository
    ) { }

    async execute(dto: CreateSessionDTO): Promise<Result<Session>> {
        try {
            // ✅ 1. Session name (Value Object)
            const nameOrError = SessionName.create(dto.name);
            if (nameOrError.isFailure) return Result.fail(nameOrError.errorValue());

            // ✅ 2. Content — at least one section must be selected
            const sectionIds = dto.sectionIds ?? [];
            if (sectionIds.length === 0) {
                return Result.fail("Select at least one section to include");
            }

            // ✅ 3. Audience — at least one department/location, or All Locations
            const departmentIds = dto.departmentIds ?? [];
            const locationIds = dto.locationIds ?? [];
            const allLocations = dto.allLocations ?? false;
            if (departmentIds.length === 0 && locationIds.length === 0 && !allLocations) {
                return Result.fail("Select at least one department or location");
            }

            // ✅ 4. Delivery
            if (!dto.host || dto.host.trim().length === 0) {
                return Result.fail("A host is required");
            }
            if (!VALID_SESSION_TYPES.includes(dto.sessionType)) {
                return Result.fail(`sessionType must be one of: ${VALID_SESSION_TYPES.join(", ")}`);
            }
            const passThreshold = dto.passThreshold ?? 0;
            if (dto.sessionType === "assessment" && (passThreshold < 0 || passThreshold > 100)) {
                return Result.fail("Pass threshold must be between 0 and 100");
            }

            // ✅ 5. A session cannot exist without a training template (business rule).
            // A malformed id (invalid UUID syntax, Postgres error code 22P02) is
            // treated as "not found" rather than leaking a raw DB error; other
            // errors (e.g. DB unavailable) still propagate as genuine failures.
            if (!dto.templateId || dto.templateId.trim().length === 0) {
                return Result.fail("A training template is required");
            }
            let template;
            try {
                template = await this.quizRepo.findById(dto.templateId);
            } catch (err) {
                if (err && typeof err === "object" && (err as any).code === "22P02") {
                    template = null;
                } else {
                    throw err;
                }
            }
            if (!template) {
                return Result.fail(`Training template with id ${dto.templateId} not found`);
            }

            // ✅ 6. Build the Aggregate Root (Session)
            const session = new Session({
                templateId: dto.templateId,
                name: nameOrError.getValue(),
                departmentIds,
                locationIds,
                allLocations,
                sectionIds,
                host: dto.host.trim(),
                sessionType: dto.sessionType,
                passThreshold,
                allowMultipleAttempts: dto.allowMultipleAttempts ?? false,
                additionalNotes: dto.additionalNotes ?? "",
            });

            // ✅ 7. Persist via Repository
            const saved = await this.sessionRepo.save(session);
            return Result.ok(saved);
        } catch (error) {
            return Result.fail(`Failed to create session: ${error}`);
        }
    }
}
