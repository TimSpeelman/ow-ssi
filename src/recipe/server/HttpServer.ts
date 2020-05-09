import bodyParser from "body-parser";
import cors from "cors";
import express, { NextFunction, Request, Response } from "express";
import { IPv8Service } from "../../ipv8/IPv8Service";
import { OWAttester } from "../../ow/protocol/OWAttester";
import { OWVerifier } from "../../ow/protocol/OWVerifier";
import { OWAttestOffer, OWVerifyRequest } from "../../ow/protocol/types";
import { Dict } from "../../types/Dict";
import { ProcedureConfig } from "../../types/types";
import { paths, ReqProcedure, ServerDescriptor } from "./IAttestationServerRESTAPI";
import { Validation } from "./Validation";

export class HttpServer {

    constructor(
        private procedures: Dict<ProcedureConfig>,
        private description: ServerDescriptor,
        private port: number,
        private ipv8: IPv8Service,
        private logger: (...args: any[]) => void = console.log,
    ) { }

    public start() {
        const app = express();
        app.use(bodyParser.json({ type: "application/json" }));
        app.use(cors());

        app.get(paths.about, this.handleGetAbout.bind(this));
        app.post(paths.procedure, this.handlePostProcedure.bind(this));
        app.use(this.handleError.bind(this));

        this.logger(`Listening at port ${this.port}.`);
        app.listen(this.port);
    }

    protected handleGetAbout(req: Request, res: Response) {
        res.setHeader("content-type", "application/json");
        res.send(this.description);
    }

    protected async handlePostProcedure(req: Request, res: Response, next: NextFunction) {
        res.setHeader("content-type", "application/json");

        // Validate Request
        const data = req.body;
        const error = Validation.initiate(data);
        if (error !== false) {
            return this.sendInvalidRequest(res, `Validation Error: ${error}`);
        }
        const { procedure_id, mid_b64, verify_response } = data as ReqProcedure;
        const config = this.procedures[procedure_id];

        if (!config) {
            return this.sendInvalidRequest(res, "Procedure Unknown");
        }

        if (config.desc.requirements.length > 0) {
            const v = new OWVerifier(this.ipv8.verifierService)

            // VerifyRequest (could be cleaner)
            const vReq: OWVerifyRequest = {
                attributes: config.desc.requirements.map(a => ({
                    name: a,
                    format: "id_metadata", // FIXME,
                    ref: a,
                })),
                ref: "FIXME",
                verifier_id: "",
            }

            const errors = v.validateResponse(vReq, verify_response);

            if (errors.length > 0) {
                return this.sendInvalidRequest(res, errors[0]);
            }

            const ok = await v.verify(vReq, verify_response);

            if (!ok) {
                return this.sendInvalidRequest(res, "Verification failed");
            }

        }

        const a = new OWAttester(this.ipv8.attesterService)

        const credentials = verify_response.attributes.map((a) => ({ // TODO remove
            attribute_name: a.ref,
            attribute_value: a.value,
            attribute_hash: a.hash,
        }))

        const attributes = await config.resolver(credentials);

        const offer: OWAttestOffer = {
            ref: "",
            attester_id: "FIXME",
            subject_id: mid_b64,
            attributes: attributes.map(a => ({
                format: "id_format",
                name: a.attribute_name,
                value: a.attribute_value,
            })),
            expiresAtTimeInMillis: Date.now() + 60 * 1000,
        }

        a.attestByOffer(offer).catch(next);

        res.send({ offer });
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
