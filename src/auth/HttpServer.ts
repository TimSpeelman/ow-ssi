import bodyParser from "body-parser";
import cors from "cors";
import debug from "debug";
import express, { Request, Response } from "express";
import fs from "fs";
import path from "path";
import uuid from "uuid/v4";
import { OWVerifyResponseValidator } from "../../modules/browser/ow";
import { IPv8Service } from "../ipv8/IPv8Service";
import { OWVerifier } from "../ow/protocol/OWVerifier";
import { OWVerifyRequest, OWVerifyResponse } from "../ow/protocol/types";
import { Dict } from "../types/Dict";
import { paths, VerifyResult } from "./IVerifyServerAPI";

const log = debug("ow-ssi:verify-http-server");

interface VerifySession {
    templateName: string;
    result?: VerifyResult;
    request?: OWVerifyRequest;
}

export class VerifyHttpServer {

    private sessions: Dict<VerifySession> = {};

    constructor(
        private templates: Dict<OWVerifyRequest>,
        private port: number,
        private verifier: OWVerifier,
        private ipv8: IPv8Service,
        private logger: (...args: any[]) => void = log,
    ) {

    }

    public start() {
        const app = express();
        app.use(bodyParser.json({ type: "application/json" }));
        app.use(cors());

        // Endpoints
        app.post(paths.newSession, this.handleNewSession.bind(this));
        app.post(paths.getRequest, this.handleGetRequest.bind(this));
        app.post(paths.verifyMe, this.handleVerifyMe.bind(this));
        app.get(paths.getResult, this.handleGetResult.bind(this));
        app.get("/client.js", this.handleGetClientScript.bind(this));
        app.get("/templates", this.handleGetTemplates.bind(this));

        app.use(this.handleError.bind(this));

        this.logger(`Listening at port ${this.port}.`);
        app.listen(this.port);
    }

    /** List all templates in our current configuration */
    protected handleGetTemplates(req: Request, res: Response) {
        res.set('Content-Type', 'application/json')
        res.send(this.templates);
    }

    /** Serve a simple JS client interface to use this service */
    protected handleGetClientScript(req: Request, res: Response) {
        res.set('Content-Type', 'text/javascript')
        const js = fs.readFileSync(path.join(__dirname, "client.js"), { encoding: "utf8" });

        // Replace the initialization URL with our current address
        const initURL = `${req.protocol}://${req.headers.host}${paths.newSession}`;

        res.send(js.replace("%INITURL%", initURL));
    }

    /**
     * The web-client creates an IntentToVerify object which it 
     * communicates to the user's Wallet. The UUID allows the
     * web-client to fetch the verification result once the Wallet
     * has completed it.
     */
    protected handleNewSession(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");

        const { template } = req.query;

        if (!(template in this.templates)) {
            return this.sendInvalidRequest(res, "No such template");
        }

        const uuid = this.createNewSessionFromTemplate(template);
        const address = `${req.protocol}://${req.headers.host}`;
        const redirectURL = `${address}${paths.getRequest}?uuid=${uuid}`;
        const resultURL = `${address}${paths.getResult}?uuid=${uuid}`;

        res.send({ resultURL, redirectURL })
    }

    /**
     * The Wallet will call this endpoint to retrieve the 
     * OWVerifyRequest that belongs to the UUID it has received.
     */
    protected async handleGetRequest(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");

        const { uuid } = req.query;

        if (!(uuid in this.sessions)) {
            return this.sendInvalidRequest(res, "No such uuid");
        }

        const address = `${req.protocol}://${req.headers.host}`;
        const responseURL = `${address}${paths.verifyMe}?uuid=${uuid}`;

        res.send(await this.makeVerifyRequest(uuid, responseURL))
    }

    /**
     * The Wallet will call this endpoint to submit its
     * OWVerifyResponse that belongs to the UUID of this
     * verification procedure.
     */
    protected handleVerifyMe(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");

        const { uuid } = req.query;

        if (!(uuid in this.sessions)) {
            return this.sendInvalidRequest(res, "No such uuid");
        }

        const { response } = req.body;
        const error = OWVerifyResponseValidator(response);

        if (error) {
            return this.sendInvalidRequest(res, "Invalid VerifyResponse:" + error);
        }

        const address = `${req.protocol}://${req.headers.host}`;

        this.handleVerifyResponse(uuid, response, address)
            .then((ok) => res.send({ success: ok }))
            .catch((e) => this.sendInvalidRequest(res, "Verification failed:" + e.message))
    }

    /**
     * The web-client will poll this endpoint to receive the
     * verification result in JWT format.
     */
    protected handleGetResult(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");

        const { uuid } = req.query;

        if (!(uuid in this.sessions)) {
            return this.sendInvalidRequest(res, "No such uuid");
        }

        res.send({ result: this.sessions[uuid].result })
    }

    /** Simply register a new session */
    protected createNewSessionFromTemplate(templateName: string) {
        const id = uuid();

        this.sessions[id] = { templateName };

        return id;
    }

    /** Generate the VerifyRequest to send to the subject */
    protected async makeVerifyRequest(uuid: string, responseUrl: string): Promise<OWVerifyRequest> {
        const session = this.sessions[uuid];

        const request = {
            ...this.templates[session.templateName],
            verifier_id: await this.getMyId(),
            http_return_address: responseUrl
        };

        session.request = request;

        return request;
    }

    /** Perform verification based on a response */
    protected async handleVerifyResponse(uuid: string, response: OWVerifyResponse, baseUrl: string) {
        const session = this.sessions[uuid];

        const req = session.request;

        if (this.verifier.validateResponse(req, response).length > 0) {
            log("Invalid OWVerifyResponse")
            return new Error("Invalid response");
        } else {
            log("Server Verifying")
            return this.verifier.verify(req, response)
                .then((ok) => {
                    log("Verify successful")
                    this.sessions[uuid].result = {
                        success: ok.success,
                        response: ok ? response : undefined,
                    }
                    return ok;
                })
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

    protected getMyId() {
        return this.ipv8.api.getMyId();
    }
}
