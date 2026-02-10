import { MongoQuizRepository } from "../../../infra/db/MongoQuizRepository";
import { DeleteQuizUseCase } from "./DeleteQuizUseCase";

const quizRepository = new MongoQuizRepository();
const deleteQuizUseCase = new DeleteQuizUseCase(quizRepository);

export { deleteQuizUseCase };
