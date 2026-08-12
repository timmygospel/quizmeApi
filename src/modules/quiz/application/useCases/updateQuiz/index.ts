import { PgQuizRepository } from "../../../infra/db/PgQuizRepository";
import { UpdateQuizUseCase } from "./UpdateQuizUseCase";

const quizRepository = new PgQuizRepository();
const updateQuizUseCase = new UpdateQuizUseCase(quizRepository);

export { updateQuizUseCase };
