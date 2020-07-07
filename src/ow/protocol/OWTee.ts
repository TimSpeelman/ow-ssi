import debug from "debug";
import { AttestationSpec, IAttesteeService } from "../../ipv8/services/types/IAttesteeService";
import { Dict } from "../../types/Dict";
import { Hook } from "../../util/Hook";
import { OWAPI, OWMessage } from "../api/OWAPI";
import { IOWAttributeRepository } from "../IOWAttributeRepository";
import { OWAttestSession } from "./OWAttestSession";
import { OWAttestOfferValidator } from "./syntax-validation";
import { OWAttestedAttr, OWAttestOffer, OWAttestResponse, OWVerifyRequest, OWVerifyResponse } from "./types";


/**
 * The Attestee
 * - [ ] handles incoming aoffer messages
 * - [ ] creates asessions
 * - [ ] stores asessions
 * - [ ] attests by asessions
 */
export class OWTee {

    protected log = debug("ow-ssi:ow:owtee");

    protected sessions: Dict<OWAttestSession> = {};

    public newSessionHook = new Hook<OWAttestSession>();

    constructor(
        protected myId: string,
        protected api: OWAPI,
        protected ipv8attestee: IAttesteeService,
        protected repo: IOWAttributeRepository) { }

    handleOfferMessage(message: OWMessage) {
        try {
            const data = JSON.parse(message.message);
            if (data.type !== "OWAttestOffer") { return false }
            const validationError = OWAttestOfferValidator(data);
            if (validationError) {
                this.log(`WARN: Incoming OWAttestOffer validation error: ${validationError}`)
            }
            this.newSessionFromOffer(data);
            return true;
        } catch (e) {
            return false;
        }
    }

    newSessionFromOffer(offer: OWAttestOffer) {
        const session = new OWAttestSession(offer.attester_id, this.myId, offer);
        const id = session.offer.ref; // FIXME
        if (id in this.sessions) {
            throw new Error(`Session with id '${id}' already exists..`)
        }
        this.sessions[id] = session;
        this.log(`Created new session from request with id '${id}'`)
        this.newSessionHook.fire(session);
        session.offered();
    }

    async acceptSession(session: OWAttestSession): Promise<boolean> {
        if (!this.sendAccept(session)) {
            this.log("Could not send response")
            return false;
        } else {
            this.log("Requesting attestation")
            this.requestAttestation(session);
            session.accepted();
            return true;
        }
    }

    rejectSession(session: OWAttestSession) {
        throw new Error("Not implemented")
    }

    protected async sendAccept(session: OWAttestSession): Promise<boolean> {
        const body: OWAttestResponse = { type: "OWAttestResponse", ref: session.offer.ref, answer: true } // FIXME OWAttestResponse
        const responseMessage = JSON.stringify(body);
        const couldSend = await this.api.sendMessage(session.attesterId, responseMessage);
        if (!couldSend) {
            return false; // failed to accept, because attester offline
        }
    }

    protected async requestAttestation(session: OWAttestSession) {
        const attrs = await this.requestAttestationByOffer(session.offer);

        await Promise.all(attrs.map(r => this.repo.put(r)))
        session.attested("FIXME"); // TODO can we get the verification result as verifiee?
    }


    async requestAttestationByOffer(offer: OWAttestOffer): Promise<OWAttestedAttr[]> {
        const specs = offer.attributes.map((a): AttestationSpec => ({
            attribute_name: a.name,
            id_format: a.format,
        }))
        const attestations = await this.ipv8attestee.requestAttestation(offer.attester_id, specs);
        return attestations.map(r => {
            const matchingOfferAttr = offer.attributes.find(a => a.name === r.attribute_name); // FIXME unsafe
            return {
                format: matchingOfferAttr.format,
                hash: r.attribute_hash,
                name: r.attribute_name,
                metadata: r.metadata,
                time: 0, // FIXME
                title: {}, // FIXME
                signer_mid_b64: r.signer_mid_b64,
                value: matchingOfferAttr.value, // FIXME must be self-verified
            }
        });
    }
}

export type RequestHandler = (request: OWVerifyRequest) => OWVerifyResponse
