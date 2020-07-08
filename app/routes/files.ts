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
        /***** Get metadata of all files *****/
        this.router.get("/", query(FileQuerySchema), this.wrapAsync(async (req: any, res: Response) => {
            const files = await File.find(req.querymen.query, req.querymen.select, req.querymen.cursor);

            res.json({
                meta: req.querymen.cursor,
                result: files
            })
        }));

        /***** Get one file by ID *****/
        this.router.get("/:id", this.wrapAsync(async (req: Request, res: Response) => {
            const file = await File.findById(req.params.id).exec();

            if(!file) {
                return res.status(404).send();
            }

            const readStream = this.gfs.createReadStream({
                _id: req.params.id,
                root: 'uploads'
            });

            readStream.pipe(res);
        }));

        /***** Create a new version of a file *****/
        this.router.put("/:id", this.wrapAsync(async (req: Request, res: Response) => {
            throw new Error("Not implemented");
        }));

        /***** Delete a file *****/
        this.router.delete("/:id", this.wrapAsync(async (req: Request, res: Response) => {
            throw new Error("Not implemented");
        }));

        /***** Create a new file *****/
        this.router.post("/", this.wrapAsync(async (req: Request, res: Response) => {
            let response: any[] = [];

            req.busboy.on("file", (field, file, filename, encoding, mimetype) => {
                const id = mongoose.Types.ObjectId().toHexString();
                logger.info("New File", {field, filename, encoding, mimetype, id});

                file.on("data", data => {
                    // logger.debug("New File", {length: data.length, filename, encoding, mimetype});
                })
                file.on("end", data => {
                    response.push({
                        _id: id,
                        filename: filename,
                        contentType: mimetype
                    });
                    logger.info("File end", {field});
                })

                const writeStream = this.gfs.createWriteStream({
                    _id: id,
                    filename: filename,
                    mode: "w",
                    content_type: mimetype,
                    root: "uploads"
                });

                file.pipe(writeStream);
            });

            req.busboy.on("finish", () => res.json(response));
            req.pipe(req.busboy);
        }));

        return this.router;
    }
}
