import { AttesteeService } from "../../src/ipv8/services/AttesteeService";
import { AttesterService } from "../../src/ipv8/services/AttesterService";
import { OWAttestedAttr } from "../../src/ow/protocol/types";

export async function attest(
    attester: AttesterService,
    attestee: AttesteeService,
    attester_id: string,
    attestee_id: string,
    attributes: Array<{ attribute_name: string, attribute_value: string }>
): Promise<OWAttestedAttr[]> {

    const validUntil = Date.now() + 10000
    attester.stageAttestation(attestee_id, attributes, validUntil);

    const credentials = attributes.map(a => ({ attribute_name: a.attribute_name, id_format: "id_metadata" }))
    const attestations = await attestee.requestAttestation(attester_id, credentials);

    return attestations.map((a, i) => ({
        format: "id_metadata",
        hash: a.attribute_hash,
        name: a.attribute_name,
        metadata: a.metadata,
        time: 0, // FIXME
        title: {}, // FIXME
        signer_mid_b64: a.signer_mid_b64,
        value: attributes[i].attribute_value,
    }))
}
