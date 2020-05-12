import bodyParser from "body-parser";
import cors from "cors";
import debug from "debug";
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import uuid from "uuid/v4";
import { OWVerifier } from "../ow/protocol/OWVerifier";
import { OWVerifyRequest, OWVerifyResponse } from "../ow/protocol/types";
import { Dict } from "../types/Dict";
import { paths, VerifyResult } from "./IVerifyServerAPI";

const log = debug("ow-ssi:verify-http-server");

interface VerifySession {
    template: string;
    result?: VerifyResult;
}

export class VerifyHttpServer {

    private refs: Dict<VerifySession> = {};

    constructor(
        private templates: Dict<OWVerifyRequest>,
        private port: number,
        private verifier: OWVerifier,
        private logger: (...args: any[]) => void = log,
    ) {

    }

    //
    //
    //
    // TODO: Add directly embeddable script for web-client that generates QR and polls result.
    //
    //
    //

    public start() {
        const app = express();
        app.use(bodyParser.json({ type: "application/json" }));
        app.use(cors());

        app.post(paths.newSession, this.handleGetReference.bind(this));
        app.post(paths.getRequest, this.handleGetVerifyRequest.bind(this));
        app.post(paths.verifyMe, this.handleVerifyMe.bind(this));
        app.get(paths.getResult, this.handleGetResult.bind(this));
        app.get("/client.js", this.serveScript.bind(this));

        app.use(this.handleError.bind(this));

        this.logger(`Listening at port ${this.port}.`);
        app.listen(this.port);
    }

    protected serveScript(req: Request, res: Response) {
        res.set('Content-Type', 'text/javascript')
        const js = fs.readFileSync(path.join(__dirname, "client.js"), { encoding: "utf8" });
        const initURL = `${req.protocol}://${req.headers.host}${paths.newSession}`;
        res.send(js.replace("%INITURL%", initURL));
    }

    /**
     * The web-client creates an IntentToVerify object which it 
     * communicates to the user's Wallet. The UUID allows the
     * web-client to fetch the verification result once the Wallet
     * has completed it.
     */
    protected handleGetReference(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");

        const template = req.query.template;

        // TODO Include uuid in request?
        const url = `${req.protocol}://${req.headers.host}`;

        if (template in this.templates) {
            const uuid = this.createUUID(template);
            const redirectURL = `${url}${paths.getRequest}?uuid=${uuid}`;
            const resultURL = `${url}${paths.getResult}?uuid=${uuid}`;

            res.send({ resultURL, redirectURL })
        } else {
            this.sendInvalidRequest(res, "No such template");
        }
    }

    /**
     * The Wallet will call this endpoint to retrieve the 
     * OWVerifyRequest that belongs to the UUID it has received.
     */
    protected handleGetVerifyRequest(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");

        const uuid = req.query.uuid;
        const response_url = `${req.protocol}://${req.headers.host}${paths.verifyMe}?uuid=${uuid}`;

        if (!(uuid in this.refs)) {
            this.sendInvalidRequest(res, "No such uuid");
        } else {
            const template = this.refs[uuid].template;
            res.send(this.makeVerifyRequest(template, response_url)) // TODO include uuid in return_address?
        }
    }

    /**
     * The Wallet will call this endpoint to submit its
     * OWVerifyResponse that belongs to the UUID of this
     * verification procedure.
     */
    protected handleVerifyMe(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");

        const uuid = req.query.uuid; // TODO include uuid in GET?
        const response = req.body.response;
        const baseUrl = `${req.protocol}://${req.headers.host}`;

        if (!(uuid in this.refs)) {
            this.sendInvalidRequest(res, "No such uuid");
        } else {
            const result = this.handleVerifyResponse(uuid, response, baseUrl);
            res.send({ success: true })
        }
    }

    /**
     * The web-client will poll this endpoint to receive the
     * verification result in JWT format.
     */
    protected handleGetResult(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");

        const uuid = req.query.uuid;

        if (!(uuid in this.refs)) {
            this.sendInvalidRequest(res, "No such uuid");
        } else {
            res.send({ result: this.refs[uuid].result })
        }
    }

    protected createUUID(template: string) {
        const id = uuid();
        this.refs[id] = { template };
        return id;
    }

    protected makeVerifyRequest(template: string, responseUrl: string): OWVerifyRequest {
        return {
            ...this.templates[template],
            http_return_address: responseUrl
        };
    }

    protected handleVerifyResponse(uuid: string, response: OWVerifyResponse, baseUrl: string) {
        const process = this.refs[uuid];
        const req = this.makeVerifyRequest(process.template, baseUrl);

        if (this.verifier.validateResponse(req, response).length > 0) {
            log("Invalid OWVerifyResponse")
            return new Error("Invalid response");
        } else {
            log("Server Verifying")
            this.verifier.verify(req, response)
                .then((ok) => {
                    log("Verify successful")
                    this.refs[uuid].result = {
                        success: ok,
                        response: ok ? response : undefined,
                    }
                })
                .catch((e) => {
                    log("Verify errd")
                    throw e

                });
        }
    }

    protected sendInvalidRequest(res: Response, error: string) {
        return res.status(400).send({ error });
    }

    protected handleError(err, req: Request, res: Response, next) {
        this.logger("HttpServer Error", err);

        if (res.headersSent) {
            return next(err)
        }
        res.setHeader("content-type", "application/json");
        res.status(500)
        res.send({
            error: {
                message: err.message,
                name: err.name,
            }
        })
    }
}
