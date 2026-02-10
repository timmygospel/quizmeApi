import { MongoQuizRepository } from "../../../infra/db/MongoQuizRepository";
import { UpdateQuizUseCase } from "./UpdateQuizUseCase";

const quizRepository = new MongoQuizRepository();
const updateQuizUseCase = new UpdateQuizUseCase(quizRepository);

export { updateQuizUseCase };
