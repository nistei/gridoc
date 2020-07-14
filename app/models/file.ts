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
    findNewestInfoByFileId(id: string): Promise<IFile>
    findNewestInfoByFileIdAndVersion(id: string, version: string): Promise<IFile>
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

schema.statics.findNewestInfoByFileId = function (id: string) {
    return this.findOne({'metadata.fileId': id}).sort('-metadata.version');
};

schema.statics.findNewestInfoByFileIdAndVersion = function (id: string, version: string) {
    return this.findOne({"metadata.fileId": id, "metadata.version": version});
};

const querySchema: QuerySchema = {
    filename: String,
    filenameRegex: {
        type: RegExp,
        paths: ["filename"]
    },
    contentType: [String],
    version: {
        type: [Number],
        paths: ["metadata.version"]
    },
    fileId: {
        type: [String],
        paths: ["metadata.fileId"]
    },
    lengthLte: {
        type: Number,
        paths: ["length"],
        operator: "$lte"
    },
    lengthGte: {
        type: Number,
        paths: ["length"],
        operator: "$gte"
    },
    uploadedBefore: {
        type: Date,
        paths: ["uploadDate"],
        operator: "$lte"
    },
    uploadedAfter: {
        type: Date,
        paths: ["uploadDate"],
        operator: "$gte"
    },
    versionGte: {
        type: Number,
        paths: ["metadata.version"],
        operator: "$gte"
    },
    versionLte: {
        type: Number,
        paths: ["metadata.version"],
        operator: "$lte"
    }
};

export const File = mongoose.model<IFile>("File", schema, 'uploads.files') as IFileModel;
export const FileQuerySchema = querySchema;
