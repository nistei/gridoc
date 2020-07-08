// @ts-ignore
import {Schema as QuerySchema} from 'querymen';
import {Document, Model, Schema, Types} from "mongoose";
import * as mongoose from "mongoose";

export interface IFile extends Document {
    filename: string;
    contentType: string;
    length: number;
    chunkSize: number;
    uploadDate: Date;
    md5: string;
    metadata: IFileMeta
}

export interface IFileMeta {
    version: number;
    fileId: Types.ObjectId;
}

export interface IFileModel extends Model<IFile> {
}

const schema = new Schema({
    filename: String,
    contentType: String,
    length: Number,
    chunkSize: Number,
    uploadDate: Date,
    md5: String,
    metadata: {
        version: Number,
        fileId: Schema.Types.ObjectId
    }
}, {strict: false});

const querySchema: QuerySchema = {
};

export const File = mongoose.model<IFile>("File", schema, 'uploads.files') as IFileModel;
export const FileQuerySchema = querySchema;
