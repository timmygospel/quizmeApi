import { Attempt } from "../../../domain/Attempt";
import { IAttemptRepository } from "../../../domain/IAttemptRepository";
import { ITestSessionRepository } from "../../../domain/ITestSessionRepository";
import { IAssessmentRepository } from "../../../../assessment/domain/IAssessmentRepository";
import { scoreAttempt } from "../../../domain/scoreAttempt";

export interface FinalizeExpiredAttemptDeps {
    attemptRepo: IAttemptRepository;
    testSessionRepo: ITestSessionRepository;
    assessmentRepo: IAssessmentRepository;
}

// Shared by SaveResponseUseCase and SubmitAttemptUseCase: an attempt whose
// expires_at has passed is finalized right there rather than accepting the
// write — scored against whatever responses were already saved (unanswered
// = incorrect), and the participant is marked TIMED_OUT.
export async function finalizeExpiredAttempt(attempt: Attempt, deps: FinalizeExpiredAttemptDeps): Promise<Attempt> {
    const session = await deps.testSessionRepo.findById(attempt.testSessionId);
    const assessment = session ? await deps.assessmentRepo.findById(session.assessmentId) : null;
    const totalQuestions = assessment?.questions?.length ?? 0;

    const responses = await deps.attemptRepo.findResponses(attempt.id!);
    const { scorePercentage, passed } = scoreAttempt(
        totalQuestions,
        responses.map((r) => ({ isCorrect: r.isCorrect === true })),
        assessment?.passMark ?? 0
    );

    const updated = await deps.attemptRepo.markTimedOut(attempt.id!, scorePercentage, passed, attempt.expiresAt);
    await deps.testSessionRepo.updateParticipantStatus(attempt.testSessionParticipantId, "TIMED_OUT", {
        completedAt: attempt.expiresAt,
    });
    return updated;
}
