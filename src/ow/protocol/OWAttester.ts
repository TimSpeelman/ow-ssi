
import { AttesterService } from "../../ipv8/services/AttesterService";
import { Attribute } from "../../ipv8/services/types/Attribute";
import { OWAttestOffer } from "../types";

/**
 * Takes an <OW:AttestOffer> and invokes IPv8 attestation as Attester.
 */
export class OWAttester {

    constructor(protected ipv8Attester: AttesterService) { }

    public async attestByOffer(offer: OWAttestOffer) {
        const attrs = offer.attributes.map((a): Attribute => ({
            attribute_name: a.name,
            attribute_value: a.value,
        }))
        const validUntil = Date.now() + 10000; // FIXME
        this.ipv8Attester.stageAttestation(offer.subject_id, attrs, validUntil);
    }

}
