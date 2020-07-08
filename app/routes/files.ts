import {Request, Response, Router} from "express";
// @ts-ignore
import {middleware as query} from 'querymen';
import Grid from "gridfs-stream";
import {File, FileQuerySchema, IFile} from "../models/file";
import * as logger from "winston";
import mongoose = require("mongoose");

export class FilesRouter {

    private router: Router = Router();
    private gfs = Grid(mongoose.connection.db, mongoose.mongo);

    wrapAsync(fn: any) {
        return function (req: Request, res: Response, next: any) {
            fn(req, res, next).catch(next);
        };
    }

    getRouter(): Router {
        /***** Get info of all files *****/
        this.router.get("/", query(FileQuerySchema), this.wrapAsync(async (req: any, res: Response) => {
            const files = await File.find(req.querymen.query, req.querymen.select, req.querymen.cursor);

            res.json({
                meta: req.querymen.cursor,
                result: files
            })
        }));

        /***** Get one file by File ID *****/
        this.router.get("/:id", this.wrapAsync(async (req: Request, res: Response) => {
            const file = await this.getNewestFileInfo(req.params.id);

            if (!file) {
                return res.status(404).send();
            }

            const readStream = this.gfs.createReadStream({
                _id: file._id,
                root: 'uploads'
            });

            readStream.pipe(res);
        }));

        /***** Get info for the newest version of a file *****/
        this.router.get("/:id/info", this.wrapAsync(async (req: Request, res: Response) => {
            const file = await this.getNewestFileInfo(req.params.id);

            if (!file) {
                return res.status(404).send();
            }

            return res.json(file);
        }));

        /***** Get all versions of one file *****/
        this.router.get("/:id/versions", this.wrapAsync(async (req: Request, res: Response) => {
            const current = await this.getNewestFileInfo(req.params.id);

            if (!current) {
                return res.status(404).send();
            }

            const all = await File.find({"metadata.fileId": req.params.id})
                .sort('-metadata.version')
                .exec();

            res.json({current: current, all: all});
        }));

        /***** Get a specific version of one file *****/
        this.router.get("/:id/versions/:version", this.wrapAsync(async (req: Request, res: Response) => {
            const file = await this.getFileInfoWithVersion(req.params.id, req.params.version);

            if (!file) {
                return res.status(404).send();
            }

            const readStream = this.gfs.createReadStream({
                _id: file._id,
                root: 'uploads'
            });

            readStream.pipe(res);
        }));

        /***** Get info for a specific version of one file *****/
        this.router.get("/:id/versions/:version/info", this.wrapAsync(async (req: Request, res: Response) => {
            const file = await this.getFileInfoWithVersion(req.params.id, req.params.version);

            if (!file) {
                return res.status(404).send();
            }

            return res.json(file);
        }));

        /***** Create a new version of a file *****/
        this.router.put("/:id", this.wrapAsync(async (req: Request, res: Response) => {
            const oldVersion = await this.getNewestFileInfo(req.params.id);

            if (!oldVersion) {
                return res.status(404).send();
            }

            const newVersion = ++oldVersion.metadata.version;

            let response: any[] = [];

            // TODO: Ensure only one file gets delivered
            req.busboy.on("file", (field, file, filename, encoding, mimetype) => {
                file.on("end", () => {
                    response.push({
                        filename: filename,
                        contentType: mimetype,
                        metadata: {
                            fileId: oldVersion.metadata.fileId,
                            version: newVersion
                        }
                    });
                    logger.info("File end", {field});
                })

                const writeStream = this.gfs.createWriteStream({
                    filename: filename,
                    mode: "w",
                    content_type: mimetype,
                    root: "uploads",
                    metadata: {
                        fileId: oldVersion.metadata.fileId,
                        version: newVersion
                    }
                });

                file.pipe(writeStream);
            });

            req.busboy.on("finish", () => res.json(response));
            req.pipe(req.busboy);
        }));

        /***** Delete a file *****/
        this.router.delete("/:id", this.wrapAsync(async (req: Request, res: Response) => {
            const current = await this.getNewestFileInfo(req.params.id);

            if (!current) {
                return res.status(404).send();
            }

            const all = await File.find({"metadata.fileId": req.params.id}).exec();

            all.forEach(file => {
                this.gfs.remove({_id: file._id, root: 'uploads'}, err => {
                    if (err) {
                        throw err;
                    }
                });
            });

            return res.status(200).send();
        }));

        /***** Delete a specific version of a file *****/
        this.router.delete("/:id/versions/:version", this.wrapAsync(async (req: Request, res: Response) => {
            const file = await this.getFileInfoWithVersion(req.params.id, req.params.version);

            if (!file) {
                return res.status(404).send();
            }

            this.gfs.remove({_id: file._id, root: 'uploads'}, err => {
                if (err) {
                    throw err;
                }
            });

            return res.status(200).send();
        }));

        /***** Create a new file *****/
        this.router.post("/", this.wrapAsync(async (req: Request, res: Response) => {
            let response: any[] = [];

            req.busboy.on("file", (field, file, filename, encoding, mimetype) => {
                const id = mongoose.Types.ObjectId();

                logger.info("New File", {field, filename, encoding, mimetype, id});

                file.on("end", () => {
                    response.push({
                        _id: id.toHexString(),
                        filename: filename,
                        contentType: mimetype,
                        metadata: {
                            fileId: id,
                            version: 1
                        }
                    });
                    logger.info("File end", {field});
                })

                const writeStream = this.gfs.createWriteStream({
                    _id: id.toHexString(),
                    filename: filename,
                    mode: "w",
                    content_type: mimetype,
                    root: "uploads",
                    metadata: {
                        fileId: id,
                        version: 1
                    }
                });

                file.pipe(writeStream);
            });

            req.busboy.on("finish", () => res.json(response));
            req.pipe(req.busboy);
        }));

        return this.router;
    }

    private async getNewestFileInfo(fileId: string): Promise<IFile> {
        return new Promise<IFile>(async (resolve, reject) => {
            logger.info("Looking for file with fileId", {id: fileId});
            const fileMeta = await File.findOne({'metadata.fileId': fileId})
                .sort('-metadata.version')
                .exec();

            if (!fileMeta) {
                logger.error("File not found", {FileId: fileId});
                return resolve(undefined);
            }

            logger.info("Found file", {file: fileMeta});
            return resolve(fileMeta);
        });
    }

    private async getFileInfoWithVersion(fileId: string, version: string): Promise<IFile> {
        return new Promise<IFile>(async (resolve, reject) => {
            logger.info("Looking for file with fileId and version", {fileId, version});
            const fileMeta = await File.findOne({"metadata.fileId": fileId, "metadata.version": version})
                .exec();

            if (!fileMeta) {
                logger.error("File not found", {fileId, version});
                return resolve(undefined);
            }

            logger.info("Found file", {file: fileMeta});
            return resolve(fileMeta);
        });
    }
}
