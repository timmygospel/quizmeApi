import mongoose, { Schema, Document, Types } from "mongoose";

export interface IQuestionBankOptionSubdoc {
    text: string;
    correct: boolean;
}

export interface IQuestionBankDocument extends Document {
    _id?: Types.ObjectId | string;
    question: string;
    options: IQuestionBankOptionSubdoc[];
    categoryId?: Types.ObjectId | string | null;
    createdAt: Date;
    updatedAt: Date;
}

const OptionSchema = new Schema<IQuestionBankOptionSubdoc>(
    {
        text: { type: String, required: true },
        correct: { type: Boolean, required: true },
    },
    { _id: false }
);

const QuestionBankSchema = new Schema<IQuestionBankDocument>(
    {
        question: { type: String, required: true },
        options: { type: [OptionSchema], required: true },
        categoryId: { type: Schema.Types.ObjectId, required: false, default: null },
    },
    { timestamps: true }
);

export const QuestionBankModel = mongoose.model<IQuestionBankDocument>(
    "QuestionBankQuestion",
    QuestionBankSchema
);
