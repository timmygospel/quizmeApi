import mongoose, { Schema, Document, Types } from "mongoose";

export interface ICategoryDocument extends Document {
    _id?: Types.ObjectId | string;
    name: string;
    createdAt: Date;
    updatedAt: Date;
}

const CategorySchema = new Schema<ICategoryDocument>(
    {
        name: { type: String, required: true, unique: true },
    },
    { timestamps: true }
);

export const CategoryModel = mongoose.model<ICategoryDocument>("Category", CategorySchema);
