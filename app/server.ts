// Setup Logging
import * as logger from "winston";

logger.configure({
    transports: [
        new logger.transports.Console()
    ],
    format: logger.format.json()
});

import express from "express";
import {FilesRouter} from "./routes/files";
import {getDbUri, serverConfig} from "./_config/config";
import connectBusboy from "connect-busboy";
import mongoose = require("mongoose");

const app: express.Application = express();
const expressWinston = require('express-winston');

app.use(connectBusboy());

const server = app.listen(serverConfig.port, async () => {
    logger.info("Connecting to DB", {host: serverConfig.database.host})

    try {
        await mongoose.connect(getDbUri(), {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            useCreateIndex: true
        });

        logger.info("Successful database connect", {host: serverConfig.database.host})
    } catch (err) {
        logger.error("Error connecting to database", err);
        process.exit(1);
    }

    // Healthcheck before logger to not log it
    app.use('/healthz', require('express-healthcheck')({
        test: function () {
            if (mongoose.connection.readyState !== 1) {
                throw new Error("Not connected to DB");
            }
        }
    }));

    // Express request logger
    app.use(expressWinston.logger({
        transports: [
            new logger.transports.Console()
        ],
        format: logger.format.json()
    }));

    // GET default route -> Service infos
    app.get("/", (request: express.Request, response: express.Response) => {
        response.json({
            name: "Gridoc CMS",
            version: "0.0.1"
        })
    });

    /***** Load the router *****/
    app.use("/api/v1/files", new FilesRouter().getRouter());

    // Error handler
    app.use((err: Error & { status: number }, req: express.Request, res: express.Response, next: express.NextFunction): void => {
        switch (err.name) {
            case "CastError":
            case "ValidationError":
                err.status = 400;
                break;
        }

        res.status(err.status || 500);
        logger.error("", err);

        res.json({
            status: err.status || 500,
            name: err.name || "Server error",
            message: err.message || "An internal error occurred"
        })
    });


    logger.info("Server is listening", {port: serverConfig.port});
});

export {server};
