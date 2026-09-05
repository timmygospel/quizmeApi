import { BaseController } from "../../../../../shared/core/BaseController";

// testSession use cases prefix a Result.fail() message with one of these
// tags when the failure isn't a plain 400 validation error, so every
// controller in this module maps them to the same HTTP status consistently.
export function mapFailure(controller: BaseController, error: string): void {
    if (error.startsWith("NOT_FOUND:")) {
        controller.notFound(error.replace("NOT_FOUND:", "").trim());
        return;
    }
    if (error.startsWith("FORBIDDEN:")) {
        controller.forbidden(error.replace("FORBIDDEN:", "").trim());
        return;
    }
    if (error.startsWith("CONFLICT:")) {
        controller.conflict(error.replace("CONFLICT:", "").trim());
        return;
    }
    controller.clientError(error);
}
