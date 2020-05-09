/**
 * 
 * Upon receiving the OW:VerifyRequest the peer must resolve by:
 * - finding attestations the match the requirements
 * - finding corresponding attribute values
 * - check if constraints are satisfied
 * This forms an <OW:VerifyResponse>
 * 
 */

import { VerifieeService } from "../ipv8/services/VerifieeService";
import { OWVerifyRequest } from "./types";

export class OWVerifieeService {
    constructor(
        private ipv8Verifiee: VerifieeService,
    ) { }

    /** 
     * Upon consent, the Verifiee must allow IPv8 verification of requested
     * attributes according to the spec.
     */
    allowVerification(
        vReq: OWVerifyRequest,
        validUntil: number) {

        const names = vReq.attributes.map(a => a.name);
        return this.ipv8Verifiee.stageVerification(vReq.verifier_id, names, validUntil);
    }

}
