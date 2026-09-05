import { Attempt } from "./Attempt";
import { AttemptResponse } from "./AttemptResponse";

export interface IAttemptRepository {
    findById(id: string): Promise<Attempt | null>;
    countForParticipant(participantId: string): Promise<number>;
    create(attempt: Attempt): Promise<Attempt>;
    markSubmitted(id: string, scorePercentage: number, passed: boolean, submittedAt: Date): Promise<Attempt>;
    markTimedOut(id: string, scorePercentage: number, passed: boolean, submittedAt: Date): Promise<Attempt>;

    // Returns null when selectedOptionId doesn't belong to assessmentQuestionId
    // (invalid input rather than a domain error) — computes is_correct via the
    // assessment_question_options join so callers never handle raw option
    // correctness themselves.
    upsertResponse(attemptId: string, assessmentQuestionId: string, selectedOptionId: string): Promise<AttemptResponse | null>;
    findResponses(attemptId: string): Promise<AttemptResponse[]>;
}
