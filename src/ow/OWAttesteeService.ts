/**
 * Takes an <OW:AttestOffer> and if it passes the spam filter and user consent,
 * invokes IPv8 attestation, followed by self-verification and stores it in the
 * user's repository.
 */

import { AttesteeService } from "../ipv8/services/AttesteeService";
import { AttestationSpec } from "../ipv8/services/types/IAttesteeService";
import { AttestedAttr, OWAttestOffer } from "./types";

export class OWAttesteeService {

    private consentCallback: ConsentCallback; // TODO : can also disambiguate

    /** Allowed references */
    private allowedRefs: string[] = [];

    constructor(protected ipv8Attestee: AttesteeService,
        protected allowWithoutReference = false) { }

    public async handleOffer(offer: OWAttestOffer, filterSpam = true): Promise<AttestedAttr[]> {
        // Filter out offers that do not have a registered reference (i.e. are not expected)
        if (filterSpam && !this.allowWithoutReference && !this.allowedRefs.find(r => r === offer.ref)) {
            console.log("Ignored OWAttestOffer", offer.ref)
            return;
        }

        const consent = await this.consentCallback(offer);

        if (consent) {
            return this.requestAttestationByOffer(offer);
        }
    }



    setConsentCallback(callback: ConsentCallback) {
        this.consentCallback = callback;
    }

    async requestAttestationByOffer(offer: OWAttestOffer): Promise<AttestedAttr[]> {
        const specs = offer.attributes.map((a): AttestationSpec => ({
            attribute_name: a.name,
            id_format: a.format,
        }))
        const attestations = await this.ipv8Attestee.requestAttestation(offer.attester_id, specs);
        return attestations.map(r => {
            const matchingOfferAttr = offer.attributes.find(a => a.name === r.attribute_name); // FIXME unsafe
            return {
                format: matchingOfferAttr.format,
                hash: r.attribute_hash,
                name: r.attribute_name,
                metadata: r.metadata,
                signer_mid_b64: r.signer_mid_b64,
                value: matchingOfferAttr.value, // FIXME must be self-verified
            }
        });
    }

    /** Allows any future offer that comes in via this reference */
    allowRef(ref: string) {
        this.allowedRefs.push(ref);
    }

    /** Removes an allowed reference */
    disallowRef(ref: string) {
        this.allowedRefs = this.allowedRefs.filter(r => r !== ref);
    }

}

export type ConsentCallback = (res: OWAttestOffer) => Promise<boolean>
