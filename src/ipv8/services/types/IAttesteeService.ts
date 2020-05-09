import { Attestation } from "../../api/types";

/**
 * The AttesteeService requests attestation and awaits the result
 */
export interface IAttesteeService {
    /** Request attestation of n attributes by a peer */
    requestAttestation(
        mid_b64: string,
        credentials: AttestationSpec[],
    ): Promise<Attestation[]>
}

export interface AttestationSpec {
    attribute_name: string,
    id_format: string,
}
