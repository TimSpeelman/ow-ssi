import debug from "debug";
import { IVerifieeService } from "../../ipv8/services/types/IVerifieeService";
import { Dict } from "../../types/Dict";
import { Hook } from "../../util/Hook";
import { OWAPI, OWMessage } from "../api/OWAPI";
import { OWVerification } from "./OWVerification";
import { OWVerifyRequestValidator } from "./syntax-validation";
import { OWVerifyRequest, OWVerifyResponse } from "./types";


/**
 * The Verifiee
 * - [x] handles incoming vreq messages
 * - [x] creates vsessions
 * - [ ] stores vsessions
 * - [x] verifies vsessions
 * - [x] answers with vresps
 * - 
 */
export class OWVee {

    protected log = debug("ow-ssi:ow:owvee");

    protected sessions: Dict<OWVerification> = {};

    public newSessionHook = new Hook<OWVerification>();

    constructor(
        protected myId: string,
        protected api: OWAPI,
        protected ipv8verifiee: IVerifieeService) { }

    handleRequestMessage(message: OWMessage) {
        try {
            const data = JSON.parse(message.message);
            const validationError = OWVerifyRequestValidator(data);
            if (validationError) {
                this.log(`WARN: Incoming OWVerifyRequest validation error: ${validationError}`)
            }
            this.newSessionFromRequest(data);
        } catch (e) {
            return false;
        }
    }

    newSessionFromRequest(request: OWVerifyRequest) {
        const session = new OWVerification(request.verifier_id, this.myId, request);
        const id = session.request.ref; // FIXME
        if (id in this.sessions) {
            throw new Error(`Session with id '${id}' already exists..`)
        }
        this.sessions[id] = session;
        this.log(`Created new session from request with id '${id}'`)
        this.newSessionHook.fire(session);
        session.requested();
    }

    async acceptSession(session: OWVerification, response: OWVerifyResponse): Promise<boolean> {
        if (!this.sendResponse(session, response)) {
            this.log("Could not send response")
            return false;
        } else {
            this.log("Staging verification")
            this.stageVerification(session);
            session.accepted(response);
            return true;
        }
    }

    rejectSession(session: OWVerification) {
        throw new Error("Not implemented")
    }

    protected async sendResponse(session: OWVerification, response: OWVerifyResponse): Promise<boolean> {
        const responseMessage = JSON.stringify(response);
        const couldSend = await this.api.sendMessage(session.verifierId, responseMessage);
        if (!couldSend) {
            return false; // failed to accept, because verifier offline
        }
    }

    protected stageVerification(session: OWVerification) {
        // stage the verification
        const validUntil = Date.now() + 60 * 1000; // FIXME, must be included in response
        this.ipv8verifiee.stageVerification(
            session.verifierId, session.request.attributes.map(a => a.name), validUntil)
            .then(() => {
                session.verified("FIXME"); // TODO can we get the verification result as verifiee?
            })
            .catch(() => this.log(`Verification failed`))
    }


}

export type RequestHandler = (request: OWVerifyRequest) => OWVerifyResponse
