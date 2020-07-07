import debug from "debug";
import { Attribute } from "../../ipv8/services/types/Attribute";
import { AttestationResult, IAttesterService } from "../../ipv8/services/types/IAttesterService";
import { Dict } from "../../types/Dict";
import { Hook } from "../../util/Hook";
import { OWAPI, OWMessage } from "../api/OWAPI";
import { OWAttestSession, OWAttestStatus } from "./OWAttestSession";
import { OWAttestOffer, OWAttestResponse, OWVerifyRequest, OWVerifyResponse } from "./types";


/**
 * The Attester
 * - [ ] sends offers
 * - [ ] creates asessions
 * - [ ] stores asessions
 * - [ ] attests by asessions
 */
export class OWTer {

    protected log = debug("ow-ssi:ow:owter");

    protected sessions: Dict<OWAttestSession> = {};

    public newSessionHook = new Hook<OWAttestSession>();

    constructor(
        protected myId: string,
        protected api: OWAPI,
        protected ipv8attester: IAttesterService) { }


    attest(offer: OWAttestOffer): Promise<OWAttestSession> {
        return new Promise((resolve, reject) => {
            const session = this.newSessionFromOffer(offer);

            this.sendOffer(session)
                .then((success) => !success && reject(new Error("Could not send request")))
                .catch(reject);

            session.statusHook.on((status) => {
                // Automatically attest when the attestee accepts the offer
                if (status === OWAttestStatus.ACCEPTED) {
                    this.log("Offer accepted, now attesting");
                    this.attestSession(session)
                        .then((results) => {
                            session.attested(results);
                            resolve(session);
                        })
                        .catch(reject);
                }
            })
        })
    }

    newSessionFromOffer(offer: OWAttestOffer) {
        const session = new OWAttestSession(this.myId, offer.subject_id, offer);
        const id = session.offer.ref; // FIXME
        if (id in this.sessions) {
        }
        this.sessions[id] = session;
        this.newSessionHook.fire(session);
        return session;
    }

    async sendOffer(session: OWAttestSession) {
        const mid = session.subjectId;
        if (!mid) {
            throw new Error("Subject not specified");
        }
        const message = JSON.stringify(session.offer);
        this.log("Sending offer", session.offer);
        const couldSend = await this.api.sendMessage(mid, message);
        if (couldSend) {
            session.offered();
        }
        return couldSend;
    }


    handleResponseMessage(message: OWMessage) {
        try {
            const data = JSON.parse(message.message);
            if (data.type !== "OWAttestResponse") { return false }
            // const validationError = OWAttestOfferValidator(data); // FIXME
            // if (validationError) {
            //     this.log(`WARN: Incoming OWAttestResponse validation error: ${validationError}`)
            // }
            this.log("Received response", data)
            this.handleResponse(data);
            return true;
        } catch (e) {
            return false;
        }
    }

    handleResponse(response: OWAttestResponse) {
        if (!response.ref || !(response.ref in this.sessions)) {
            throw new Error(`Cannot place response. No session with id '${response.ref}'.`)
        }
        const session = this.sessions[response.ref];

        if (response.answer) {
            session.accepted();
        } else {
            session.rejected();
        }
    }

    async acceptSession(session: OWAttestSession): Promise<AttestationResult[]> {
        if (!this.sendAccept(session)) {
            this.log("Could not send response")
            return [];
        } else {
            this.log("Requesting attestation")
            const results = await this.attestSession(session);
            session.accepted();
            return results;
        }
    }

    rejectSession(session: OWAttestSession) {
        throw new Error("Not implemented")
    }

    protected async sendAccept(session: OWAttestSession): Promise<boolean> {
        const body = { ref: session.offer.ref, answer: "accept" } // FIXME OWAttestResponse
        const responseMessage = JSON.stringify(body);
        const couldSend = await this.api.sendMessage(session.attesterId, responseMessage);
        if (!couldSend) {
            return false; // failed to accept, because attester offline
        }
    }

    protected attestSession(session: OWAttestSession): Promise<AttestationResult[]> {
        return new Promise((resolve, reject) => {

            const validUntil = Date.now() + 10000; // FIXME

            const attrs = session.offer.attributes.map((a): Attribute =>
                ({ attribute_name: a.name, attribute_value: a.value }))

            // Listen for completed attestations.
            let remaining = attrs.slice();
            const popIfIncluded = (a: Attribute): boolean => {
                const i = remaining.findIndex(r => r.attribute_name === a.attribute_name &&
                    r.attribute_value === a.attribute_value);
                if (i >= 0) {
                    remaining.splice(i, 1);
                    return true;
                } else {
                    return false;
                }
            }

            const results: AttestationResult[] = [];
            this.ipv8attester.attestationHook.on((a) => {
                const included = popIfIncluded(a.attribute);
                if (included) {
                    results.push(a);
                    if (remaining.length === 0) {
                        // TODO unregister
                        resolve(results);
                    }
                }
            })

            this.ipv8attester.stageAttestation(session.subjectId, attrs, validUntil);

        })
    }


}

export type RequestHandler = (request: OWVerifyRequest) => OWVerifyResponse
