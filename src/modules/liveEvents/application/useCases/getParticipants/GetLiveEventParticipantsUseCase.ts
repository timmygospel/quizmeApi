import { UseCase } from "../../../../../shared/core/UseCase";
import { ILiveEventAnalyticsRepository } from "../../../domain/ILiveEventAnalyticsRepository";
import { ParticipantTableDTO } from "../../../dtos/DashboardDTO";

export class GetLiveEventParticipantsUseCase implements UseCase<string, Promise<ParticipantTableDTO>> {
    constructor(private readonly repo: ILiveEventAnalyticsRepository) {}

    async execute(eventCode: string): Promise<ParticipantTableDTO> {
        const rows = await this.repo.getParticipants(eventCode);
        return { rows, total: rows.length, page: 1, pageSize: rows.length || 1 };
    }
}
