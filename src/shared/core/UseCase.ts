/**
 * Base UseCase interface — defines a contract for all use case classes.
 * Example:
 *  class CreateQuizUseCase implements UseCase<CreateQuizDTO, Result<Quiz>> {}
 */
export interface UseCase<IRequest, IResponse> {
    execute(request?: IRequest): Promise<IResponse> | IResponse;
}
