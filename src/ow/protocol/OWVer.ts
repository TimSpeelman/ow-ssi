import debug from "debug";
import { AttributeWithHash } from "../../ipv8/services/types/Attribute";
import { IVerifierService } from "../../ipv8/services/types/IVerifierService";
import { Dict } from "../../types/Dict";
import { Hook } from "../../util/Hook";
import { OWAPI, OWMessage } from "../api/OWAPI";
import { OWVerification, OWVerifyError } from "./OWVerification";
import { OWVerifyResponseValidator } from "./syntax-validation";
import { OWVerifyRequest, OWVerifyResponse } from "./types";

/**
 * The Verifier
 * - [x] creates vsessions
 * - [x] sends vreqs
 * - [ ] handles incoming vresp messages
 * - [ ] validates vresps
 * - [ ] stores vsessions
 * - [ ] verifies vsessions
 * 
 * Note both verifier and verifiee can initiate verification. For example
 * with Recipes, the request (template) is specified in the recipe.  
 */
export class OWVer {

    protected log = debug("ow-ssi:ow:owver");

    protected sessions: Dict<OWVerification> = {};

    public newSessionHook = new Hook<OWVerification>();

    constructor(
        protected myId: string,
        protected api: OWAPI,
        protected ipv8verifier: IVerifierService) { }

    newSessionFromRequest(request: OWVerifyRequest) {
        const session = new OWVerification(this.myId, request.subject_id, request);
        const id = session.request.ref; // FIXME
        if (id in this.sessions) {
            throw new Error(`Session with id '${id}' already exists..`)
        }
        this.sessions[id] = session;
        this.newSessionHook.fire(session);
        return session;
    }

    async sendRequest(session: OWVerification) {
        const mid = session.subjectId;
        if (!mid) {
            throw new Error("Subject not specified");
        }
        const message = JSON.stringify(session.request);
        const couldSend = await this.api.sendMessage(mid, message);
        if (couldSend) {
            session.requested();
        }
    }

    handleResponseMessage(message: OWMessage) {
        try {
            const data = JSON.parse(message.message);
            const validationError = OWVerifyResponseValidator(data);
            if (validationError) {
                this.log(`WARN: Incoming OWVerifyResponse validation error: ${validationError}`)
            }
            this.handleResponse(data);
        } catch (e) {
            return false;
        }
    }

    handleResponse(response: OWVerifyResponse) {
        if (!response.ref || !(response.ref in this.sessions)) {
            throw new Error(`Cannot place response. No session with id '${response.ref}'.`)
        }
        const session = this.sessions[response.ref];
        const errors = this.validateResponseSemantically(session.request, response);

        if (errors.length > 0) {
            session.error(OWVerifyError.foul(`Received invalid response, with errors: ${errors.join(", ")}`))
            return;
        } else {
            session.accepted(response); // TODO Handle rejects
        }
    }

    async verifySession(session: OWVerification) {
        if (!session.canBeVerified) {
            throw new Error("This session cannot be verified");
        }
        const { request, response } = session;
        const credentials: AttributeWithHash[] = session.response.attributes.map((respAttr) => {
            const reqAttr = session.request.attributes.find(a => a.ref === respAttr.ref);
            return {
                attribute_name: reqAttr.name,
                attribute_hash: respAttr.hash,
                attribute_value: respAttr.value, // FIXME. If response does not specify VALUE, what will you test?
            }
        })
        session.verifying();
        const result = await this.ipv8verifier.verify(response.subject_id, credentials);
        session.verified(result);
    }

    // TODO: apply constraints
    validateResponseSemantically(req: OWVerifyRequest, resp: OWVerifyResponse): string[] {

        const errors = [];

        if (req.ref !== resp.ref) {
            errors.push("References do not match")
        }

        if (req.subject_id && resp.subject_id !== req.subject_id) {
            errors.push("Subject ID different from request");
        }

        if (req.attributes.length !== resp.attributes.length) {
            errors.push("Invalid number of attributes");
        }

        const queue = req.attributes.slice();

        resp.attributes.forEach(respAttr => {
            const index = queue.findIndex(a => a.ref === respAttr.ref);

            if (index < 0) {
                errors.push(`Provided attribute with ref '${respAttr.ref}' was not requested`)
            } else {
                const reqAttr = queue.splice(index, 1)[0];
                if (reqAttr.include_value && !respAttr.value) {
                    errors.push(`Missing value for attribute with ref '${respAttr.ref}'`)
                }
            }
        })

        queue.forEach((reqAttr) => {
            errors.push(`Response missing attribute with ref '${reqAttr.ref}'`)
        })

        return errors;

    }

}