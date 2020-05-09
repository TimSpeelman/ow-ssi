import { AttesteeService } from "../../ipv8/services/AttesteeService";
import { AttestationSpec } from "../../ipv8/services/types/IAttesteeService";
import { AttestedAttr, OWAttestOffer } from "../types";
import { OWAttestOfferValidator } from "./syntax-validation";

/**
 * Takes an <OW:AttestOffer> and invokes IPv8 attestation as Attestee.
 */
export class OWAttestee {

    constructor(protected ipv8Attestee: AttesteeService) { }

    validateOffer(offer: OWAttestOffer): string[] {
        const error = OWAttestOfferValidator(offer);
        return error ? [error] : [];
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
}
