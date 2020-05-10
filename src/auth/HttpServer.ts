import bodyParser from "body-parser";
import cors from "cors";
import debug from "debug";
import express, { Request, Response } from "express";
import QRCode from "qrcode-svg";
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

        app.get(paths.getReference, this.handleGetReference.bind(this));
        app.get(paths.getVerifyRequest, this.handleGetVerifyRequest.bind(this));
        app.post(paths.verifyMe, this.handleVerifyMe.bind(this));
        app.get(paths.getResult, this.handleGetResult.bind(this));

        app.use(this.handleError.bind(this));

        this.logger(`Listening at port ${this.port}.`);
        app.listen(this.port);
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

        // Include uuid in request?
        const url = `http://localhost:${this.port}` // FIXME

        if (template in this.templates) {
            const uuid = this.createUUID(template);
            const data = { type: "IntentToVerify", uuid, url }
            const qr = new QRCode({
                content: JSON.stringify(data),
                width: 256,
                height: 256,
                color: "#000000",
                background: "#ffffff",
                ecl: "M",
            }).svg();

            res.send({ data, qr })
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

        if (!(uuid in this.refs)) {
            this.sendInvalidRequest(res, "No such uuid");
        } else {
            const template = this.refs[uuid].template;
            res.send(this.getVerifyRequest(template)) // include uuid in return_address?
        }
    }

    /**
     * The Wallet will call this endpoint to submit its
     * OWVerifyResponse that belongs to the UUID of this
     * verification procedure.
     */
    protected handleVerifyMe(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");

        const uuid = req.body.uuid; // include uuid in GET?
        const response = req.body.response;

        if (!(uuid in this.refs)) {
            this.sendInvalidRequest(res, "No such uuid");
        } else {
            const result = this.handleVerifyResponse(uuid, response);
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

    protected getVerifyRequest(template: string): OWVerifyRequest {
        return {
            ...this.templates[template],
            http_return_address: `http://localhost:${this.port}/verifyMe` // FIXME 
        };
    }

    protected handleVerifyResponse(uuid: string, response: OWVerifyResponse) {
        const process = this.refs[uuid];
        const req = this.getVerifyRequest(process.template);

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
