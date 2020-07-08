import {Document, Model, Schema} from "mongoose";
// @ts-ignore
import {Schema as QuerySchema} from 'querymen';
import * as mongoose from "mongoose";

export interface IFile extends Document {
    filename: String;
    contentType: String;
    length: Number;
    chunkSize: Number;
    uploadDate: Date;
    md5: String;
}

export interface IFileModel extends Model<IFile> {
}

const schema = new Schema({
    filename: String,
    contentType: String,
    length: Number,
    chunkSize: Number,
    uploadDate: Date,
    md5: String
}, {strict: false});

const querySchema: QuerySchema = {
};

export const File = mongoose.model<IFile>("File", schema, 'uploads.files') as IFileModel;
export const FileQuerySchema = querySchema;
