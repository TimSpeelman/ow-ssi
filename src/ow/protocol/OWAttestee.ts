import { AttestationSpec, IAttesteeService } from "../../ipv8/services/types/IAttesteeService";
import { OWAttestOfferValidator } from "./syntax-validation";
import { OWAttestedAttr, OWAttestOffer } from "./types";

/**
 * Takes an <OW:AttestOffer> and invokes IPv8 attestation as Attestee.
 */
export class OWAttestee {

    constructor(protected ipv8Attestee: IAttesteeService) { }

    validateOffer(offer: OWAttestOffer): string[] {
        const error = OWAttestOfferValidator(offer);
        return error ? [error] : [];
    }

    async requestAttestationByOffer(offer: OWAttestOffer): Promise<OWAttestedAttr[]> {
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
                time: 0, // FIXME
                title: {}, // FIXME
                signer_mid_b64: r.signer_mid_b64,
                value: matchingOfferAttr.value, // FIXME must be self-verified
            }
        });
    }
}
