import { BaseController } from "../../../../../shared/core/BaseController";

// Quiz use cases tag a Result.fail() message when it isn't a plain 400
// validation error (e.g. a cross-quiz section assignment), so each
// controller maps the same failure to the same HTTP status.
export function mapFailure(controller: BaseController, error: string): void {
    if (error.startsWith("NOT_FOUND:")) {
        controller.notFound(error.replace("NOT_FOUND:", "").trim());
        return;
    }
    if (error.startsWith("UNEXPECTED:")) {
        controller.fail(error.replace("UNEXPECTED:", "").trim());
        return;
    }
    controller.clientError(error);
}
